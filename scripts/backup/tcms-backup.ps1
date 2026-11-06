<#
  TCMS backup pipeline
  --------------------
  -Mode Full         : weekly full backup (Sunday)
                       * PostgreSQL logical dump (pg_dump -Fc) + roles/globals
                       * complete copy of MinIO data dir (C:\minio\data)
                       * app config (.env) + source snapshot (no node_modules/.next)
  -Mode Incremental  : twice-daily backup
                       * PostgreSQL dump (PG16 has no native incremental dump; the
                         DB is small so a compressed snapshot each run is cheapest
                         and safest -- every incremental is independently restorable for the DB)
                       * only MinIO files changed since the last successful backup
                       * full file listing (to know which files were deleted)

  Restore: see RESTORE-README.txt written to the backup root.
#>
param(
    [ValidateSet('Full','Incremental')] [string]$Mode = 'Incremental',
    [string]$BackupRoot   = 'D:\TCMS Backup',
    [string]$AppDir       = 'C:\tcms',
    [string]$MinioDataDir = 'C:\minio\data',
    [string]$PgBin        = 'C:\Program Files\PostgreSQL\16\bin',
    [int]$KeepWeeklyFulls      = 8,    # number of weekly full backups to keep
    [int]$KeepIncrementalDays  = 35    # incrementals older than this are deleted
)

$ErrorActionPreference = 'Stop'
$startTime = Get-Date
$stamp     = $startTime.ToString('yyyy-MM-dd_HHmm')

$logDir   = Join-Path $BackupRoot 'logs'
$stateDir = Join-Path $BackupRoot 'state'
$fullRoot = Join-Path $BackupRoot 'weekly-full'
$incRoot  = Join-Path $BackupRoot 'daily-incremental'
foreach ($d in @($BackupRoot,$logDir,$stateDir,$fullRoot,$incRoot)) {
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}
$logFile   = Join-Path $logDir ("backup-{0}.log" -f $startTime.ToString('yyyy-MM'))
$stateFile = Join-Path $stateDir 'last-success.json'
$lockFile  = Join-Path $stateDir 'backup.lock'
$rcLog     = Join-Path $logDir ('robocopy-{0}.log' -f $startTime.ToString('yyyy-MM'))

function Log([string]$msg, [string]$level = 'INFO') {
    $line = "{0} [{1}] [{2}] {3}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $level, $Mode, $msg
    Add-Content -Path $logFile -Value $line -Encoding UTF8
    Write-Host $line
}

function Write-EventSafe([string]$msg, [string]$type) {
    try {
        if (-not [System.Diagnostics.EventLog]::SourceExists('TCMS-Backup')) {
            New-EventLog -LogName Application -Source 'TCMS-Backup'
        }
        $id = if ($type -eq 'Error') { 1001 } else { 1000 }
        Write-EventLog -LogName Application -Source 'TCMS-Backup' -EntryType $type -EventId $id -Message $msg
    } catch { }
}

# ---- single-instance lock -------------------------------------------------
if (Test-Path $lockFile) {
    $age = (Get-Date) - (Get-Item $lockFile).LastWriteTime
    if ($age.TotalHours -lt 6) { Log "Another backup is running (lock file present). Exiting." 'WARN'; exit 2 }
    Log "Stale lock file found (>6h old); removing." 'WARN'
    Remove-Item $lockFile -Force
}
Set-Content -Path $lockFile -Value $PID

$state = $null
if (Test-Path $stateFile) { $state = Get-Content $stateFile -Raw | ConvertFrom-Json }

# Incremental with no prior full backup -> promote to full
if ($Mode -eq 'Incremental' -and (-not $state -or -not $state.lastFull)) {
    Log "No previous full backup found -- running a Full backup instead." 'WARN'
    $Mode = 'Full'
}

$prefix  = if ($Mode -eq 'Full') { 'FULL' } else { 'INC' }
$target  = Join-Path $(if ($Mode -eq 'Full') { $fullRoot } else { $incRoot }) "$($prefix)_$stamp"
$working = "$target.partial"

try {
    Log "===== Starting $Mode backup -> $target ====="
    New-Item -ItemType Directory -Path $working -Force | Out-Null
    $dbDir = Join-Path $working 'database'; New-Item -ItemType Directory $dbDir | Out-Null
    $fsDir = Join-Path $working 'files';    New-Item -ItemType Directory $fsDir | Out-Null

    # ---- read DB connection from .env (no secrets duplicated in this script) ----
    $envFile = Join-Path $AppDir '.env'
    $dbLine  = Get-Content $envFile | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
    if (-not $dbLine) { throw "DATABASE_URL not found in $envFile" }
    $dbUrl = ($dbLine -replace '^\s*DATABASE_URL\s*=\s*','').Trim().Trim('"').Trim("'")
    $m = [regex]::Match($dbUrl, '^postgres(?:ql)?://([^:]+):([^@]*)@([^:/]+)(?::(\d+))?/([^?]+)')
    if (-not $m.Success) { throw "Could not parse DATABASE_URL" }
    $pgUser = [uri]::UnescapeDataString($m.Groups[1].Value)
    $env:PGPASSWORD = [uri]::UnescapeDataString($m.Groups[2].Value)
    $pgHost = $m.Groups[3].Value
    $pgPort = if ($m.Groups[4].Success) { $m.Groups[4].Value } else { '5432' }
    $pgDb   = $m.Groups[5].Value

    # ---- 1. database dump --------------------------------------------------
    $dumpFile = Join-Path $dbDir "$pgDb.dump"
    Log "Dumping database $pgDb ..."
    & (Join-Path $PgBin 'pg_dump.exe') -h $pgHost -p $pgPort -U $pgUser -d $pgDb -Fc -Z 6 --no-password -f $dumpFile 2>&1 |
        ForEach-Object { Log "pg_dump: $_" 'WARN' }
    if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }

    # verify dump is readable
    $tocCount = (& (Join-Path $PgBin 'pg_restore.exe') --list $dumpFile | Measure-Object).Count
    if ($LASTEXITCODE -ne 0 -or $tocCount -lt 5) { throw "Dump verification failed (pg_restore --list entries: $tocCount)" }
    Log ("Database dump OK: {0:N2} MB, {1} TOC entries" -f ((Get-Item $dumpFile).Length/1MB), $tocCount)

    if ($Mode -eq 'Full') {
        $globals = Join-Path $dbDir 'globals-roles.sql'
        & (Join-Path $PgBin 'pg_dumpall.exe') -h $pgHost -p $pgPort -U $pgUser --globals-only --no-role-passwords --no-password -f $globals 2>&1 |
            ForEach-Object { Log "pg_dumpall: $_" 'WARN' }
        if ($LASTEXITCODE -ne 0) { Log "pg_dumpall globals failed (non-fatal)" 'WARN' }
    }
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

    # ---- 2. document storage (MinIO) ---------------------------------------
    $minioDst = Join-Path $fsDir 'minio-data'
    $allFiles = Get-ChildItem -Path $MinioDataDir -Recurse -File -Force
    # listing of every file present right now (used on restore to drop deleted files)
    $allFiles | ForEach-Object { "{0}`t{1}`t{2:o}" -f $_.FullName.Substring($MinioDataDir.Length).TrimStart('\'), $_.Length, $_.LastWriteTimeUtc } |
        Set-Content -Path (Join-Path $fsDir 'file-listing.tsv') -Encoding UTF8

    if ($Mode -eq 'Full') {
        Log "Copying full MinIO data dir ($($allFiles.Count) files) ..."
        & robocopy $MinioDataDir $minioDst /E /COPY:DAT /DCOPY:T /R:3 /W:5 /NP /NFL /NDL /LOG+:"$rcLog" | Out-Null
        if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }
        $copied = $allFiles.Count
    } else {
        # files modified since the previous successful backup (5 min overlap for safety)
        $since   = ([datetime]$state.lastSuccess).AddMinutes(-5)
        $changed = $allFiles | Where-Object { $_.LastWriteTime -gt $since -or $_.CreationTime -gt $since }
        Log "Copying $(@($changed).Count) changed MinIO files (since $since) ..."
        foreach ($f in $changed) {
            $rel  = $f.FullName.Substring($MinioDataDir.Length).TrimStart('\')
            $dest = Join-Path $minioDst $rel
            $dDir = Split-Path $dest -Parent
            if (-not (Test-Path $dDir)) { New-Item -ItemType Directory -Path $dDir -Force | Out-Null }
            Copy-Item -LiteralPath $f.FullName -Destination $dest -Force
        }
        $copied = @($changed).Count
    }

    # ---- 3. config + code (full only; .env also on incrementals) ------------
    $cfgDir = Join-Path $working 'config'; New-Item -ItemType Directory $cfgDir | Out-Null
    Copy-Item $envFile (Join-Path $cfgDir 'app.env') -Force
    $gitHead = ''
    try { $gitHead = (& git -C $AppDir rev-parse HEAD 2>$null) } catch { }
    if ($Mode -eq 'Full') {
        Log "Snapshotting application source ..."
        & robocopy $AppDir (Join-Path $working 'app-source') /E /R:1 /W:1 /NP /NFL /NDL `
            /XD node_modules .next .git logs storage /LOG+:"$rcLog" | Out-Null
        if ($LASTEXITCODE -ge 8) { Log "Source snapshot robocopy exit $LASTEXITCODE (non-fatal)" 'WARN' }
    }

    # ---- 4. manifest + finalize ---------------------------------------------
    $size = (Get-ChildItem $working -Recurse -File -Force | Measure-Object Length -Sum).Sum
    [ordered]@{
        type          = $Mode
        startedAt     = $startTime.ToString('o')
        finishedAt    = (Get-Date).ToString('o')
        host          = $env:COMPUTERNAME
        database      = $pgDb
        dbDumpBytes   = (Get-Item $dumpFile).Length
        minioFilesTotal  = $allFiles.Count
        minioFilesCopied = $copied
        incrementalSince = if ($Mode -eq 'Incremental') { $state.lastSuccess } else { $null }
        basedOnFull   = if ($Mode -eq 'Incremental') { $state.lastFull } else { $null }
        gitCommit     = $gitHead
        totalBytes    = $size
    } | ConvertTo-Json | Set-Content (Join-Path $working 'manifest.json') -Encoding UTF8

    Rename-Item -Path $working -NewName (Split-Path $target -Leaf)

    $newState = [ordered]@{
        lastSuccess     = $startTime.ToString('o')
        lastSuccessType = $Mode
        lastFull        = if ($Mode -eq 'Full') { $target } else { $state.lastFull }
        lastFullAt      = if ($Mode -eq 'Full') { $startTime.ToString('o') } else { $state.lastFullAt }
        lastBackupPath  = $target
    }
    $newState | ConvertTo-Json | Set-Content $stateFile -Encoding UTF8

    # ---- 5. retention ------------------------------------------------------
    Get-ChildItem $fullRoot -Directory | Where-Object Name -like 'FULL_*' | Where-Object Name -notlike '*.partial' |
        Sort-Object Name -Descending | Select-Object -Skip $KeepWeeklyFulls |
        ForEach-Object { Log "Retention: removing old full $($_.Name)"; Remove-Item $_.FullName -Recurse -Force }
    Get-ChildItem $incRoot -Directory | Where-Object Name -like 'INC_*' |
        Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-$KeepIncrementalDays) } |
        ForEach-Object { Log "Retention: removing old incremental $($_.Name)"; Remove-Item $_.FullName -Recurse -Force }
    # leftover failed runs older than 2 days
    Get-ChildItem $fullRoot, $incRoot -Directory | Where-Object Name -like '*.partial' |
        Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-2) } | Remove-Item -Recurse -Force

    $msg = "TCMS $Mode backup OK: $target ({0:N2} MB, {1:N0}s)" -f ($size/1MB), ((Get-Date)-$startTime).TotalSeconds
    Log $msg
    Write-EventSafe $msg 'Information'
    exit 0
}
catch {
    $err = "TCMS $Mode backup FAILED: $($_.Exception.Message)"
    Log $err 'ERROR'
    Write-EventSafe $err 'Error'
    exit 1
}
finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
}

