'use server'

import { prisma }          from '@/lib/prisma'
import { logAuditEvent }   from '@/modules/audit-trail'
import {
  uploadFile,
  getSignedFileUrl,
  getFileBuffer,
  validateFileType,
  validateFileSize,
} from '@/lib/storage'
import { createMaterialSchema } from './schema'
import { CreateMaterialInput } from './types'
import { assertTopicContentAccess } from '@/modules/topics'

// ── Allowed file types per category ──────────────────────────────

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  PPT:   ['ppt', 'pptx'],
  PDF:   ['pdf'],
  VIDEO: ['mp4', 'mov', 'avi', 'webm'],
  OTHER: ['doc', 'docx', 'xls', 'xlsx', 'csv'],
}

const MIME_TYPES: Record<string, string> = {
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt:  'application/vnd.ms-powerpoint',
  pdf:  'application/pdf',
  mp4:  'video/mp4',
  mov:  'video/quicktime',
  avi:  'video/x-msvideo',
  webm: 'video/webm',
  doc:  'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:  'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv:  'text/csv',
}

// ── Shared select ─────────────────────────────────────────────────

const MATERIAL_SELECT = {
  id:             true,
  title:          true,
  currentVersion: true,
  status:         true,
  createdAt:      true,
  updatedAt:      true,
  topic: {
    select: { id: true, name: true },
  },
  versions: {
    select: {
      id:            true,
      versionLabel:  true,
      status:        true,
      uploadedBy:    { select: { id: true, name: true } },
      approvedBy:    { select: { id: true, name: true } },
    },
    orderBy: { versionNo: 'desc' as const },
  },
} as const

// ── Get all materials ─────────────────────────────────────────────

export async function getMaterials(filters?: {
  topicId?:  string
  status?:   string
  search?:   string
}) {
  const where: Record<string, unknown> = {}

  if (filters?.topicId) where.topicId = filters.topicId
  if (filters?.status)  where.status  = filters.status

  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  return prisma.trainingMaterial.findMany({
    where,
    select:  MATERIAL_SELECT,
    orderBy: { updatedAt: 'desc' },
  })
}

// ── Get single material ───────────────────────────────────────────

export async function getMaterialById(id: string) {
  return prisma.trainingMaterial.findUnique({
    where:  { id },
    select: {
      ...MATERIAL_SELECT,
      versions: {
        select: {
          id:            true,
          versionNo:     true,
          versionLabel:  true,
          fileUrl:       true,
          fileName:      true,
          fileType:      true,
          changeSummary: true,
          status:        true,
          uploadedById:  true,
          approvedById:  true,
          approvedAt:    true,
          createdAt:     true,
          uploadedBy:    { select: { id: true, name: true } },
          approvedBy:    { select: { id: true, name: true } },
        },
        orderBy: { versionNo: 'desc' },
      },
    },
  })
}

// ── Upload new material / new version ────────────────────────────

export async function uploadMaterial(
  input:         CreateMaterialInput,
  fileBuffer:    Buffer,
  fileName:      string,
  fileSize:      number,
  justification: string,
  actorId:       string
) {
  await assertTopicContentAccess(input.topicId, actorId)

  // Validate input
  const parsed = createMaterialSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.message)
  }

  // Validate file size (max 100MB)
  if (!validateFileSize(fileSize, 100)) {
    throw new Error('File size exceeds 100MB limit')
  }

  // Validate file type
  const allowed = ALLOWED_EXTENSIONS[input.fileType] ?? []
  if (!validateFileType(fileName, allowed)) {
    throw new Error(
      `Invalid file type. Allowed for ${input.fileType}: ${allowed.join(', ')}`
    )
  }

  // Get file extension and MIME type
  const ext      = fileName.split('.').pop()?.toLowerCase() ?? ''
  const mimeType = MIME_TYPES[ext] ?? 'application/octet-stream'

  // Check if material already exists for this topic with same title
  const existing = await prisma.trainingMaterial.findFirst({
    where: {
      topicId: input.topicId,
      title:   { equals: input.title, mode: 'insensitive' },
    },
    include: {
      versions: {
        orderBy: { versionNo: 'desc' },
        take:    1,
      },
    },
  })

  // Upload file to MinIO
  const uploadResult = await uploadFile(
    fileBuffer,
    fileName,
    'content',
    mimeType
  )

  // Use transaction to ensure DB consistency
  const result = await prisma.$transaction(async (tx) => {
    let materialId:  string
    let versionNo:   number
    let versionLabel: string

    if (!existing) {
      // ── Create new material ──────────────────────────────────
      versionNo    = 1
      versionLabel = '1'

      const material = await tx.trainingMaterial.create({
        data: {
          title:          input.title,
          topicId:        input.topicId,
          currentVersion: versionNo,
          status:         'APPROVED',
        },
      })
      materialId = material.id

    } else {
      // ── New version of existing material ─────────────────────
      materialId = existing.id
      const lastVersion = existing.versions[0]
      versionNo    = (lastVersion?.versionNo ?? 0) + 1
      versionLabel = String(versionNo)

      // Update material current version
      await tx.trainingMaterial.update({
        where: { id: materialId },
        data:  {
          currentVersion: versionNo,
          status:         'APPROVED',
        },
      })
    }

    // Create version record — immediately available, no separate approval
    // step. Uploading is already gated by topic-level access (see
    // modules/topics/access.ts), so a second sign-off would be redundant.
    const version = await tx.materialVersion.create({
      data: {
        materialId,
        versionNo,
        versionLabel,
        fileUrl:       uploadResult.key,
        fileName,
        fileType:      input.fileType,
        changeSummary: input.changeSummary,
        status:        'APPROVED',
        uploadedById:  actorId,
        approvedById:  actorId,
        approvedAt:    new Date(),
      },
    })

    return { materialId, version, versionLabel }
  })

  // Audit log
  await logAuditEvent({
    userId:        actorId,
    action:        'UPLOAD',
    module:        'CONTENT',
    recordId:      result.materialId,
    recordType:    'TrainingMaterial',
    beforeValue:   null,
    afterValue:    {
      title:        input.title,
      versionLabel: result.versionLabel,
      fileName,
      fileSize,
    },
    justification,
  })

  return result
}

// ── Approve material version ──────────────────────────────────────

export async function approveMaterialVersion(
  versionId:     string,
  justification: string,
  actorId:       string
) {
  const version = await prisma.materialVersion.findUnique({
    where:   { id: versionId },
    include: {
      material: {
        select: {
          id:      true,
          title:   true,
          topicId: true,
        },
      },
    },
  })

  if (!version)                    throw new Error('Version not found')
  if (version.status === 'APPROVED') throw new Error('Already approved')
  if (version.status === 'RETIRED')  throw new Error('Cannot approve retired version')

  await prisma.$transaction(async (tx) => {
    // Approve this version
    await tx.materialVersion.update({
      where: { id: versionId },
      data:  {
        status:      'APPROVED',
        approvedById: actorId,
        approvedAt:  new Date(),
      },
    })

    // Update material status
    await tx.trainingMaterial.update({
      where: { id: version.materialId },
      data:  { status: 'APPROVED' },
    })
  })

  // Audit log
  await logAuditEvent({
    userId:        actorId,
    action:        'APPROVE',
    module:        'CONTENT',
    recordId:      versionId,
    recordType:    'MaterialVersion',
    beforeValue:   { status: 'DRAFT'    },
    afterValue:    { status: 'APPROVED' },
    justification,
  })
}

// ── Get in-modal preview content for a file ──────────────────────
// Never hands a raw download URL to the browser for docx/xlsx/csv —
// those are converted to HTML server-side. PDF/video/PPT still use a
// short-lived signed URL since browsers render those natively inline
// (PDF/video) or the file is opened outside the modal (PPT).

export type PreviewResult =
  | { kind: 'pdf' | 'video' | 'external'; url: string }
  | { kind: 'html'; html: string }

export async function getMaterialPreview(
  versionId: string,
  actorId:   string
): Promise<PreviewResult> {
  const version = await prisma.materialVersion.findUnique({
    where:  { id: versionId },
    select: { fileUrl: true, fileName: true, fileType: true },
  })

  if (!version) throw new Error('Version not found')

  await logAuditEvent({
    userId:        actorId,
    action:        'UPDATE',
    module:        'CONTENT',
    recordId:      versionId,
    recordType:    'MaterialVersion',
    beforeValue:   null,
    afterValue:    { viewed: true },
    justification: 'User viewed training material',
  })

  if (version.fileType === 'PDF') {
    return { kind: 'pdf', url: await getSignedFileUrl(version.fileUrl, 7200) }
  }
  if (version.fileType === 'VIDEO') {
    return { kind: 'video', url: await getSignedFileUrl(version.fileUrl, 7200) }
  }
  if (version.fileType === 'PPT') {
    return { kind: 'external', url: await getSignedFileUrl(version.fileUrl, 7200) }
  }

  // OTHER — doc/docx, xls/xlsx, csv: render to HTML server-side
  const ext    = version.fileName.split('.').pop()?.toLowerCase() ?? ''
  const buffer = await getFileBuffer(version.fileUrl)

  if (ext === 'doc' || ext === 'docx') {
    const mammoth = await import('mammoth')
    const { value: html } = await mammoth.convertToHtml({ buffer })
    return { kind: 'html', html }
  }

  if (ext === 'csv') {
    return { kind: 'html', html: rowsToHtmlTable(parseCsv(buffer.toString('utf-8'))) }
  }

  if (ext === 'xls' || ext === 'xlsx') {
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    // exceljs's bundled type declarations don't structurally match our
    // @types/node's Buffer generic, though it's the same Buffer at runtime.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any)
    const sheet = workbook.worksheets[0]

    const rows: string[][] = []
    sheet?.eachRow((row) => {
      const values = (row.values as unknown[]).slice(1) // index 0 is unused by ExcelJS
      rows.push(values.map(cellToDisplayString))
    })
    return { kind: 'html', html: rowsToHtmlTable(rows) }
  }

  throw new Error('Preview not available for this file type')
}

// ── Preview rendering helpers ─────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function rowsToHtmlTable(rows: string[][]): string {
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')
  return `<table>${body}</table>`
}

function cellToDisplayString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date)                 return value.toLocaleDateString()
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (Array.isArray(obj.richText)) {
      return (obj.richText as { text: string }[]).map((r) => r.text).join('')
    }
    if ('result' in obj) return String(obj.result ?? '')
    if ('text'   in obj) return String(obj.text)
    return ''
  }
  return String(value)
}

// Minimal RFC-4180 CSV parser — handles quoted fields, escaped quotes
// ("") and both \n and \r\n line endings. No external dependency needed
// for something this small, and it avoids pulling a parser library in
// just for previewing a comma-separated file.

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += c
      }
      continue
    }

    if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      rows.push(row); row = []
    } else {
      field += c
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

// ── Retire material version ───────────────────────────────────────

export async function retireMaterial(
  materialId:    string,
  justification: string,
  actorId:       string
) {
  const material = await prisma.trainingMaterial.findUnique({
    where:  { id: materialId },
    select: { id: true, title: true, status: true },
  })

  if (!material)                      throw new Error('Material not found')
  if (material.status === 'RETIRED')  throw new Error('Already retired')

  await prisma.$transaction(async (tx) => {
    await tx.trainingMaterial.update({
      where: { id: materialId },
      data:  { status: 'RETIRED' },
    })

    await tx.materialVersion.updateMany({
      where: { materialId, status: 'APPROVED' },
      data:  { status: 'RETIRED' },
    })
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'DEACTIVATE',
    module:        'CONTENT',
    recordId:      materialId,
    recordType:    'TrainingMaterial',
    beforeValue:   { status: material.status },
    afterValue:    { status: 'RETIRED'       },
    justification,
  })
}

// ── Get topics for dropdown ───────────────────────────────────────

export async function getActiveTopics() {
  return prisma.trainingTopic.findMany({
    where:   { isActive: true },
    select:  { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}