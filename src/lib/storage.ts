import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// ─── S3 Client (works with MinIO, AWS S3, Cloudflare R2) ─────────

const s3Client = new S3Client({
  // MinIO endpoint in development
  // Change to AWS/R2 endpoint in production
  endpoint: process.env.MINIO_ENDPOINT,

  region: process.env.MINIO_REGION ?? 'us-east-1',

  credentials: {
    accessKeyId:     process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },

  // Required for MinIO — tells SDK to use path-style URLs
  // i.e. localhost:9000/tcms-documents/file.pdf
  // instead of tcms-documents.localhost:9000/file.pdf
  forcePathStyle: true,
})

const BUCKET = process.env.MINIO_BUCKET ?? 'tcms-documents'

// ─── Types ───────────────────────────────────────────────────────

export type StorageFolder =
  | 'content'
  | 'qualifications'
  | 'certificates'
  | 'temp'

export interface UploadResult {
  key:      string  // e.g. "content/abc123-hplc-v1.pptx"
  url:      string  // signed URL for access
  fileName: string  // original file name
  fileSize: number  // in bytes
  fileType: string  // MIME type
}

// ─── Upload file ──────────────────────────────────────────────────

export async function uploadFile(
  file:     Buffer,
  fileName: string,
  folder:   StorageFolder,
  mimeType: string,
): Promise<UploadResult> {
  // Generate a unique key to prevent collisions
  const timestamp  = Date.now()
  const safeName   = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const key        = `${folder}/${timestamp}-${safeName}`

  await s3Client.send(
    new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        file,
      ContentType: mimeType,
      // Metadata stored with the file
      Metadata: {
        originalName: fileName,
        uploadedAt:   new Date().toISOString(),
      },
    })
  )

  // Generate a signed URL valid for 1 hour
  const url = await getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 3600 }
  )

  return {
    key,
    url,
    fileName,
    fileSize: file.length,
    fileType: mimeType,
  }
}

// ─── Get signed URL for an existing file ─────────────────────────
// Signed URLs are temporary — they expire after the given time
// This means files are private — you cannot access them without a valid URL

export async function getSignedFileUrl(
  key:       string,
  expiresIn: number = 3600  // 1 hour default
): Promise<string> {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn }
  )
}

// ─── Check if file exists ─────────────────────────────────────────

export async function fileExists(key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({ Bucket: BUCKET, Key: key })
    )
    return true
  } catch {
    return false
  }
}

// ─── Delete file ──────────────────────────────────────────────────
// In a regulated system we rarely delete files
// This is only used for temp folder cleanup

export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
  )
}

// ─── Helper — get file extension ─────────────────────────────────

export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

// ─── Helper — validate allowed file types ────────────────────────

export function validateFileType(
  fileName: string,
  allowed:  string[]
): boolean {
  const ext = getFileExtension(fileName)
  return allowed.includes(ext)
}

// ─── Helper — validate file size ─────────────────────────────────

export function validateFileSize(
  sizeBytes: number,
  maxMB:     number = 50
): boolean {
  return sizeBytes <= maxMB * 1024 * 1024
}