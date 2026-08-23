<#
.SYNOPSIS
  Builds a self-contained offline bundle of TCMS (app + runtime installers)
  that can be copied via USB/network share to a server with no internet access.

.USAGE
  Run this ON THE LAPTOP (which has internet), from anywhere:
    powershell -ExecutionPolicy Bypass -File scripts\prepare-offline-bundle.ps1

  Optional params:
    -Destination "D:\tcms-offline-bundle"   # where to build the bundle (default: Desktop)
    -SkipBuild                              # skip `npm run build` (reuse existing .next)
    -SkipDownloads                          # skip re-downloading installers if already present

.NOTES
  Versions pinned below were verified reachable at time of writing. Bump them here
  if you want newer releases — just update the version string, URLs follow a
  predictable pattern for Node.js and PostgreSQL (EDB) and always point to
  "latest" for MinIO/NSSM.
#>

param(
    [string]$Destination = "$env:USERPROFILE\Desktop\tcms-offline-bundle",
    [switch]$SkipBuild,
    [switch]$SkipDownloads
)

$ErrorActionPreference = "Stop"

# ── Pinned versions ────────────────────────────────────────────────
$NodeVersion = "24.14.1"
$PgVersion   = "16.6-1"
$NssmVersion = "2.24"

$NodeUrl = "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-x64.msi"
$PgUrl   = "https://get.enterprisedb.com/postgresql/postgresql-$PgVersion-windows-x64.exe"
$MinioUrl = "https://dl.min.io/server/minio/release/windows-amd64/minio.exe"
$NssmUrl = "https://nssm.cc/release/nssm-$NssmVersion.zip"

# ── Paths ───────────────────────────────────────────────────────────
$ProjectRoot   = Split-Path -Parent $PSScriptRoot
$InstallersDir = Join-Path $Destination "installers"
$AppDir        = Join-Path $Destination "app"

Write-Host "== TCMS offline bundle builder ==" -ForegroundColor Cyan
Write-Host "Project root : $ProjectRoot"
Write-Host "Bundle target: $Destination`n"

New-Item -ItemType Directory -Force -Path $InstallersDir | Out-Null
New-Item -ItemType Directory -Force -Path $AppDir | Out-Null

function Get-FileIfMissing {
    param([string]$Url, [string]$OutFile)
    if ((Test-Path $OutFile) -and $SkipDownloads) {
        Write-Host "  [skip] $(Split-Path -Leaf $OutFile) already present" -ForegroundColor DarkGray
        return
    }
    Write-Host "  Downloading $(Split-Path -Leaf $OutFile) ..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing
}

# ── 1. Download installers ───────────────────────────────────────────
Write-Host "[1/5] Fetching installers into $InstallersDir" -ForegroundColor Cyan
Get-FileIfMissing -Url $NodeUrl  -OutFile (Join-Path $InstallersDir "node-v$NodeVersion-x64.msi")
Get-FileIfMissing -Url $PgUrl    -OutFile (Join-Path $InstallersDir "postgresql-$PgVersion-windows-x64.exe")
Get-FileIfMissing -Url $MinioUrl -OutFile (Join-Path $InstallersDir "minio.exe")

$NssmZip = Join-Path $InstallersDir "nssm-$NssmVersion.zip"
Get-FileIfMissing -Url $NssmUrl -OutFile $NssmZip
$NssmExtractDir = Join-Path $InstallersDir "nssm-extracted"
if (-not (Test-Path (Join-Path $InstallersDir "nssm.exe"))) {
    Write-Host "  Extracting nssm.exe (win64) ..." -ForegroundColor Yellow
    Expand-Archive -Path $NssmZip -DestinationPath $NssmExtractDir -Force
    Copy-Item (Join-Path $NssmExtractDir "nssm-$NssmVersion\win64\nssm.exe") (Join-Path $InstallersDir "nssm.exe")
    Remove-Item $NssmExtractDir -Recurse -Force
}

# ── 2. Build the app ──────────────────────────────────────────────────
if (-not $SkipBuild) {
    Write-Host "`n[2/5] Building the app (npm run build)" -ForegroundColor Cyan
    Push-Location $ProjectRoot
    npm run build
    Pop-Location
} else {
    Write-Host "`n[2/5] Skipping build (using existing .next)" -ForegroundColor DarkGray
}

# ── 3. Copy app files into the bundle ─────────────────────────────────
Write-Host "`n[3/5] Copying app files to $AppDir" -ForegroundColor Cyan
$excludeDirs  = @(".git", "logs", ".vscode")
$excludeFiles = @("*.log")

robocopy $ProjectRoot $AppDir /E /XD $excludeDirs /XF $excludeFiles /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) {
    throw "robocopy failed while copying app files (exit code $LASTEXITCODE)"
}

# ── 4. Copy MinIO bucket data, if any exists ───────────────────────────
Write-Host "`n[4/5] Copying storage/data (MinIO bucket contents)" -ForegroundColor Cyan
$storageSrc = Join-Path $ProjectRoot "storage\data"
if (Test-Path $storageSrc) {
    $storageDest = Join-Path $Destination "storage-data"
    robocopy $storageSrc $storageDest /E /NFL /NDL /NJH /NJS /NP | Out-Null
    Write-Host "  Copied to $storageDest"
} else {
    Write-Host "  No storage/data folder found — skipping" -ForegroundColor DarkGray
}

# ── 5. Done ──────────────────────────────────────────────────────────
Write-Host "`n[5/5] Bundle ready at: $Destination" -ForegroundColor Green
Write-Host @"

Next steps:
  1. This bundle does NOT include a database dump yet. DATABASE_URL in .env
     currently points at a cloud (Neon) database, which the offline server
     can't reach. Take a dump now, while you still have internet:

       - Install PostgreSQL "Command Line Tools" only (run the installer in
         $InstallersDir, uncheck Server/pgAdmin, just need pg_dump.exe), then:

           pg_dump "<value of DATABASE_URL from .env>" -Fc -f "$Destination\tcms_backup.dump"

  2. Copy the entire "$Destination" folder to the server via USB/network share.
  3. Follow the offline install steps (Node -> PostgreSQL -> MinIO -> app)
     using the installers in the installers\ subfolder.
"@ -ForegroundColor White
