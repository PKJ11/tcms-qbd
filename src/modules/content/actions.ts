'use server'

import { prisma }          from '@/lib/prisma'
import { logAuditEvent }   from '@/modules/audit-trail'
import {
  uploadFile,
  getSignedFileUrl,
  validateFileType,
  validateFileSize,
} from '@/lib/storage'
import { createMaterialSchema } from './schema'
import { CreateMaterialInput } from './types'

// ── Allowed file types per category ──────────────────────────────

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  PPT:   ['ppt', 'pptx'],
  PDF:   ['pdf'],
  VIDEO: ['mp4', 'mov', 'avi', 'webm'],
  OTHER: ['doc', 'docx', 'xls', 'xlsx'],
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
      versionType:   true,
      status:        true,
      effectiveDate: true,
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
          versionType:   true,
          fileUrl:       true,
          fileName:      true,
          fileType:      true,
          changeSummary: true,
          effectiveDate: true,
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
      versionLabel = '1.0'

      const material = await tx.trainingMaterial.create({
        data: {
          title:          input.title,
          topicId:        input.topicId,
          currentVersion: versionNo,
          status:         'DRAFT',
        },
      })
      materialId = material.id

    } else {
      // ── New version of existing material ─────────────────────
      materialId = existing.id
      const lastVersion = existing.versions[0]
      const lastNo      = lastVersion?.versionNo ?? 0

      if (input.versionType === 'MAJOR') {
        // 1.x → 2.0
        versionNo    = Math.floor(lastNo / 10 + 1) * 10
        versionLabel = `${Math.floor(versionNo / 10)}.0`
      } else {
        // 1.0 → 1.1
        versionNo    = lastNo + 1
        const major  = Math.floor(lastNo / 10)
        const minor  = (lastNo % 10) + 1
        versionLabel = `${major}.${minor}`
      }

      // Update material current version
      await tx.trainingMaterial.update({
        where: { id: materialId },
        data:  {
          currentVersion: versionNo,
          status:         'DRAFT',
        },
      })
    }

    // Create version record
    const version = await tx.materialVersion.create({
      data: {
        materialId,
        versionNo,
        versionLabel,
        versionType:   input.versionType,
        fileUrl:       uploadResult.key,
        fileName,
        fileType:      input.fileType,
        changeSummary: input.changeSummary,
        effectiveDate: new Date(input.effectiveDate),
        status:        'DRAFT',
        uploadedById:  actorId,
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
      versionType:  input.versionType,
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
          versions: {
            where:   { status: 'APPROVED' },
            orderBy: { versionNo: 'desc' },
            take:    1,
          },
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

    if (version.versionType === 'MAJOR') {
      // Reassign the test — creates a new mandatory assignment for everyone
      // who previously completed this training.
      await triggerRetrainingForMajorVersion(
        tx,
        version.material.topicId,
        version.materialId,
        actorId,
        justification
      )
    } else {
      // Acknowledge only — just notify everyone who previously completed
      // this training that the document changed, no new assignment.
      await notifyDocumentChanged(
        tx,
        version.material.topicId,
        version.material.title
      )
    }
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

// ── Trigger retraining on major version ──────────────────────────
// URS-CNT-005 — major version change triggers retraining

async function triggerRetrainingForMajorVersion(
  tx:          Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  topicId:     string,
  materialId:  string,
  actorId:     string,
  justification: string
) {
  // Find all persons who previously COMPLETED training on this topic
  const completedAssignments = await tx.trainingAssignment.findMany({
    where: {
      topicId,
      status: 'COMPLETED',
    },
    select: {
      personId: true,
      id:       true,
    },
  })

  if (completedAssignments.length === 0) return

  // Create new RETRAINING assignments for each person
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 30) // 30 days to complete

  await tx.trainingAssignment.createMany({
    data: completedAssignments.map((a) => ({
      personId:    a.personId,
      topicId,
      trigger:     'RETRAINING' as const,
      status:      'NOT_STARTED' as const,
      assignedById: actorId,
      dueDate,
    })),
    skipDuplicates: true,
  })

  // Create notifications for impacted persons
  await tx.notification.createMany({
    data: completedAssignments.map((a) => ({
      personId: a.personId,
      type:     'RETRAINING' as const,
      channel:  'IN_APP'     as const,
      title:    'Retraining required',
      message:  `Training material has been updated (major version). Please complete retraining within 30 days.`,
    })),
  })
}

// ── Notify on acknowledge-only version change ────────────────────
// Everyone who already completed this topic's training is just informed
// the document changed — no new assignment is created.

async function notifyDocumentChanged(
  tx:          Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  topicId:     string,
  materialTitle: string
) {
  const completedAssignments = await tx.trainingAssignment.findMany({
    where:  { topicId, status: 'COMPLETED' },
    select: { personId: true },
  })

  if (completedAssignments.length === 0) return

  await tx.notification.createMany({
    data: completedAssignments.map((a) => ({
      personId: a.personId,
      type:     'DOCUMENT_UPDATED' as const,
      channel:  'IN_APP'           as const,
      title:    'Training document changed',
      message:  `"${materialTitle}" has been updated. Please review the latest version.`,
    })),
  })
}

// ── Get signed URL for viewing a file ────────────────────────────

export async function getViewUrl(
  versionId: string,
  actorId:   string
): Promise<string> {
  const version = await prisma.materialVersion.findUnique({
    where:  { id: versionId },
    select: { fileUrl: true, status: true },
  })

  if (!version) throw new Error('Version not found')

  // Log the view event
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

  // Return signed URL valid for 2 hours
  return getSignedFileUrl(version.fileUrl, 7200)
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
    action:        'DELETE',
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