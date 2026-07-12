'use server'

import { prisma }        from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import { uploadFile, getSignedFileUrl } from '@/lib/storage'
import {
  createTechniqueSchema,
  createQualificationSchema,
} from './schema'
import type {
  CreateTechniqueInput,
  CreateQualificationInput,
} from './types'
import { hasAnyRole } from '@/lib/permissions'

// ── Shared selects ────────────────────────────────────────────────

const TECHNIQUE_SELECT = {
  id:                      true,
  name:                    true,
  code:                    true,
  type:                    true,
  qualificationPeriodDays: true,
  isActive:                true,
  department: {
    select: {
      id:   true,
      name: true,
      
    },
  },
  _count: { select: { qualifications: true } },
} as const

const QUALIFICATION_SELECT = {
  id:          true,
  status:      true,
  outcome:     true,
  performedOn: true,
  initiatedAt: true,
  approvedAt:  true,
  expiryDate:  true,
  createdAt:   true,
  person: {
    select: {
      id:         true,
      name:       true,
      employeeId: true,
      department: { select: { id: true, name: true } },
    },
  },
  technique: {
    select: {
      id:   true,
      name: true,
      code: true,
      type: true,
    },
  },
  supervisor: {
    select: { id: true, name: true },
  },
  initiatedBy: {
    select: { id: true, name: true },
  },
  signatories: {
    select: {
      id:            true,
      stepOrder:     true,
      requiredRole:  true,
      status:        true,
      signedAt:      true,
      justification: true,
      signedBy:      { select: { id: true, name: true } },
    },
    orderBy: { stepOrder: 'asc' as const },
  },
  certificate: {
    select: {
      id:         true,
      certNumber: true,
      issuedAt:   true,
      fileUrl:    true,
    },
  },
  _count: { select: { scannedDocuments: true } },
} as const

// ─────────────────────────────────────────────────────────────────
// TECHNIQUE MANAGEMENT
// ─────────────────────────────────────────────────────────────────

export async function getAllTechniques(filters?: {
  departmentId?: string
  isActive?:     boolean
}) {
  const where: Record<string, unknown> = {}
  if (filters?.departmentId) where.departmentId = filters.departmentId
  if (filters?.isActive !== undefined) where.isActive = filters.isActive

  return prisma.technique.findMany({
    where,
    select:  TECHNIQUE_SELECT,
    orderBy: { name: 'asc' },
  })
}

export async function getTechniqueById(id: string) {
  return prisma.technique.findUnique({
    where:  { id },
    select: TECHNIQUE_SELECT,
  })
}

export async function createTechnique(
  input:         CreateTechniqueInput,
  justification: string,
  actorId:       string
) {
  const parsed = createTechniqueSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.message)

  const existing = await prisma.technique.findUnique({
    where: { code: input.code },
  })
  if (existing) throw new Error('A technique with this code already exists')

  const technique = await prisma.technique.create({
    data: {
      name:                    input.name,
      code:                    input.code,
      type:                    input.type,
      departmentId:            input.departmentId,
      qualificationPeriodDays: input.qualificationPeriodDays,
    },
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'CREATE',
    module:        'QUALIFICATION',
    recordId:      technique.id,
    recordType:    'Technique',
    beforeValue:   null,
    afterValue:    {
      name: input.name,
      code: input.code,
      type: input.type,
      qualificationPeriodDays: input.qualificationPeriodDays,
    },
    justification,
  })

  return technique
}

// ─────────────────────────────────────────────────────────────────
// QUALIFICATION RECORD MANAGEMENT
// ─────────────────────────────────────────────────────────────────

export async function getQualifications(filters?: {
  personId?:      string
  techniqueId?:   string
  status?:        string
  subordinateIds?: string[]   // ← new
}) {
  // Auto-expire overdue qualifications
  await prisma.qualificationRecord.updateMany({
    where: {
      status:     'APPROVED',
      expiryDate: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  })

  const where: Record<string, unknown> = {}

  if (filters?.personId) {
    where.personId = filters.personId
  } else if (filters?.subordinateIds && filters.subordinateIds.length > 0) {
    // Scope to subordinates only
    where.personId = { in: filters.subordinateIds }
  }

  if (filters?.techniqueId) where.techniqueId = filters.techniqueId
  if (filters?.status)      where.status      = filters.status

  return prisma.qualificationRecord.findMany({
    where,
    select:  QUALIFICATION_SELECT,
    orderBy: { initiatedAt: 'desc' },
  })
}

export async function getQualificationById(id: string) {
  return prisma.qualificationRecord.findUnique({
    where:  { id },
    select: {
      ...QUALIFICATION_SELECT,
      requalificationOf: true,
      scannedDocuments: {
        select: {
          id:          true,
          fileUrl:     true,
          fileName:    true,
          fileType:    true,
          description: true,
          uploadedAt:  true,
          uploadedBy:  { select: { id: true, name: true } },
        },
        orderBy: { uploadedAt: 'desc' },
      },
    },
  })
}

export async function createQualification(
  input:         CreateQualificationInput,
  justification: string,
  actorId:       string
) {
  const parsed = createQualificationSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.message)

  const [person, technique] = await Promise.all([
    prisma.person.findUnique({
      where:  { id: input.personId },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.technique.findUnique({
      where:  { id: input.techniqueId },
      select: { id: true, name: true, isActive: true, qualificationPeriodDays: true },
    }),
  ])

  if (!person)           throw new Error('Person not found')
  if (!person.isActive)  throw new Error('Person is inactive')
  if (!technique)        throw new Error('Technique not found')
  if (!technique.isActive) throw new Error('Technique is inactive')

  // Check for existing active qualification for same person+technique
  const existing = await prisma.qualificationRecord.findFirst({
    where: {
      personId:    input.personId,
      techniqueId: input.techniqueId,
      status:      { in: ['INITIATED', 'IN_PROGRESS', 'APPROVED'] },
    },
  })
  if (existing) {
    throw new Error(
      `An active qualification record already exists for ${person.name} on ${technique.name}`
    )
  }

  // Create record + signatory chain in transaction
  const qualification = await prisma.$transaction(async (tx) => {
    const qual = await tx.qualificationRecord.create({
      data: {
        personId:      input.personId,
        techniqueId:   input.techniqueId,
        status:        'IN_PROGRESS',
        performedOn:   new Date(input.performedOn),
        supervisorId:  input.supervisorId,
        initiatedById: actorId,
      },
    })

    // Create 2-step signatory chain per SOP:
    // Step 1 — Trainer/Supervisor signs off (observed competency)
    // Step 2 — Training Head gives final QA approval
    await tx.signatoryEntry.createMany({
      data: [
        {
          qualificationId: qual.id,
          stepOrder:       1,
          requiredRole:    'TRAINER',
          status:          'PENDING',
        },
        {
          qualificationId: qual.id,
          stepOrder:       2,
          requiredRole:    'TRAINING_HEAD',
          status:          'PENDING',
        },
      ],
    })

    return qual
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'CREATE',
    module:        'QUALIFICATION',
    recordId:      qualification.id,
    recordType:    'QualificationRecord',
    beforeValue:   null,
    afterValue:    {
      personName:    person.name,
      techniqueName: technique.name,
      performedOn:   input.performedOn,
      supervisorId:  input.supervisorId,
    },
    justification,
  })

  return qualification
}

// ── Sign off a qualification step ─────────────────────────────────

export async function signQualification(
  qualificationId: string,
  justification:   string,
  actorId:         string
) {
  // Get the full qualification with signatories
  const qual = await prisma.qualificationRecord.findUnique({
    where:  { id: qualificationId },
    select: {
      id:     true,
      status: true,
      person: { select: { id: true, name: true } },
      technique: { select: {
        id: true, name: true, qualificationPeriodDays: true
      } },
      signatories: {
        orderBy: { stepOrder: 'asc' },
      },
    },
  })

  if (!qual) throw new Error('Qualification record not found')
  if (qual.status === 'APPROVED') throw new Error('Already fully approved')
  if (qual.status === 'REVOKED')  throw new Error('This qualification has been revoked')

  // Get the actor's roles
  const actor = await prisma.person.findUnique({
    where:  { id: actorId },
    select: { id: true, name: true, roles: { select: { role: true } } },
  })
  if (!actor) throw new Error('Actor not found')
  const actorRoles = actor.roles.map((r) => r.role)

  // Find the next pending step
  const nextStep = qual.signatories.find((s) => s.status === 'PENDING')
  if (!nextStep) throw new Error('No pending signature steps remaining')

  // Role check — only Trainer/Guest Trainer can sign any step (Administrator
  // is scoped to user/org management only and has no qualification sign-off authority)
  if (!hasAnyRole({ roles: actorRoles }, ['TRAINER', 'GUEST_TRAINER'])) {
    throw new Error(
      `Only a Trainer can sign step ${nextStep.stepOrder}`
    )
  }

  // Check if this is the final step
  const isLastStep = nextStep.stepOrder === qual.signatories.length
  const willApprove = isLastStep

  await prisma.$transaction(async (tx) => {
    // Sign this step
    await tx.signatoryEntry.update({
      where: { id: nextStep.id },
      data:  {
        signedById:    actorId,
        signedAt:      new Date(),
        justification,
        status:        'SIGNED',
      },
    })

    if (willApprove) {
      // Calculate expiry date
      const expiryDate = new Date()
      expiryDate.setDate(
        expiryDate.getDate() + qual.technique.qualificationPeriodDays
      )

      // Final approval
      await tx.qualificationRecord.update({
        where: { id: qualificationId },
        data:  {
          status:     'APPROVED',
          outcome:    'COMPETENT',
          approvedAt: new Date(),
          expiryDate,
        },
      })

      // Generate certificate
      const certNumber = await generateCertNumber(tx)

      await tx.certificate.create({
        data: {
          certNumber,
          qualificationId,
          personId:   qual.person.id,
          issuedById: actorId,
          fileUrl:    `certificates/${qualificationId}-${certNumber}.pdf`,
          validUntil: expiryDate,
        },
      })

      // Notify the analyst
      await tx.notification.create({
        data: {
          personId: qual.person.id,
          type:     'ASSIGNMENT',
          channel:  'IN_APP',
          title:    'Qualification approved',
          message:  `You are now qualified on "${qual.technique.name}". Certificate issued. Valid until ${expiryDate.toLocaleDateString('en-IN')}.`,
        },
      })
    }
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'APPROVE',
    module:        'QUALIFICATION',
    recordId:      qualificationId,
    recordType:    'QualificationRecord',
    beforeValue:   { stepOrder: nextStep.stepOrder, status: 'PENDING' },
    afterValue:    {
      stepOrder:    nextStep.stepOrder,
      status:       'SIGNED',
      signedBy:     actor.name,
      fullyApproved: willApprove,
    },
    justification,
  })

  return { willApprove }
}

// ── Reject a qualification ─────────────────────────────────────────

export async function rejectQualification(
  qualificationId: string,
  justification:   string,
  actorId:         string
) {
  const qual = await prisma.qualificationRecord.findUnique({
    where:  { id: qualificationId },
    select: { id: true, status: true, personId: true, technique: { select: { name: true } } },
  })
  if (!qual) throw new Error('Qualification not found')

  await prisma.$transaction(async (tx) => {
    await tx.qualificationRecord.update({
      where: { id: qualificationId },
      data:  { status: 'REVOKED', outcome: 'NOT_YET_COMPETENT' },
    })

    // Update all pending signatory steps to REJECTED
    await tx.signatoryEntry.updateMany({
      where:  { qualificationId, status: 'PENDING' },
      data:   { status: 'REJECTED' },
    })

    // Notify the analyst
    await tx.notification.create({
      data: {
        personId: qual.personId,
        type:     'FAILED',
        channel:  'IN_APP',
        title:    'Qualification not approved',
        message:  `Your qualification for "${qual.technique.name}" was not approved. Please speak with your Training Coordinator.`,
      },
    })
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'REJECT',
    module:        'QUALIFICATION',
    recordId:      qualificationId,
    recordType:    'QualificationRecord',
    beforeValue:   { status: qual.status },
    afterValue:    { status: 'REVOKED', outcome: 'NOT_YET_COMPETENT' },
    justification,
  })
}

// ── Upload scanned document ────────────────────────────────────────

export async function uploadScannedDocument(
  qualificationId: string,
  fileBuffer:       Buffer,
  fileName:         string,
  fileSize:         number,
  fileType:         string,
  description:      string,
  actorId:          string
) {
  const qual = await prisma.qualificationRecord.findUnique({
    where:  { id: qualificationId },
    select: { id: true, status: true },
  })
  if (!qual) throw new Error('Qualification record not found')
  if (qual.status === 'APPROVED') {
    throw new Error('Cannot upload documents to an approved qualification')
  }

  // Validate file type
  const allowed = ['pdf', 'jpg', 'jpeg', 'png']
  const ext     = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (!allowed.includes(ext)) {
    throw new Error('Only PDF, JPG, and PNG files are allowed')
  }

  // Validate file size — 20MB max for scanned documents
  if (fileSize > 20 * 1024 * 1024) {
    throw new Error('File size exceeds 20MB limit')
  }

  const mimeTypes: Record<string, string> = {
    pdf:  'application/pdf',
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    png:  'image/png',
  }

  const uploadResult = await uploadFile(
    fileBuffer,
    fileName,
    'qualifications',
    mimeTypes[ext] ?? 'application/octet-stream'
  )

  const doc = await prisma.scannedDocument.create({
    data: {
      qualificationId,
      fileUrl:     uploadResult.key,
      fileName,
      fileType:    ext,
      description,
      uploadedById: actorId,
    },
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'UPLOAD',
    module:        'QUALIFICATION',
    recordId:      qualificationId,
    recordType:    'ScannedDocument',
    beforeValue:   null,
    afterValue:    { fileName, description, fileSize },
    justification: `Scanned qualification evidence uploaded: ${description}`,
  })

  return doc
}

// ── Get signed URL for a scanned document ─────────────────────────

export async function getScannedDocumentUrl(docId: string): Promise<string> {
  const doc = await prisma.scannedDocument.findUnique({
    where:  { id: docId },
    select: { fileUrl: true },
  })
  if (!doc) throw new Error('Document not found')
  return getSignedFileUrl(doc.fileUrl, 3600)
}

// ── Get certificate signed URL ────────────────────────────────────

export async function getCertificateUrl(certId: string): Promise<string> {
  const cert = await prisma.certificate.findUnique({
    where:  { id: certId },
    select: { fileUrl: true },
  })
  if (!cert) throw new Error('Certificate not found')
  return getSignedFileUrl(cert.fileUrl, 3600)
}

// ── Get competency matrix ─────────────────────────────────────────

export async function getCompetencyMatrix(filters?: {
  departmentId?:   string
  sectionId?:      string
  subordinateIds?: string[]   // ← new
}) {
  await prisma.qualificationRecord.updateMany({
    where: {
      status:     'APPROVED',
      expiryDate: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  })

  const persons = await prisma.person.findMany({
    where: {
      isActive: true,
      // Subordinate scoping takes priority over department/section filters
      ...(filters?.subordinateIds && filters.subordinateIds.length > 0
        ? { id: { in: filters.subordinateIds } }
        : {
            ...(filters?.departmentId && { departmentId: filters.departmentId }),
            ...(filters?.sectionId    && { sectionId:    filters.sectionId    }),
          }
      ),
    },
    select: {
      id:          true,
      name:        true,
      employeeId:  true,
      department:  { select: { name: true } },
      qualificationRecords: {
        select: {
          id:          true,
          status:      true,
          expiryDate:  true,
          techniqueId: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const techniques = await prisma.technique.findMany({
    where:   { isActive: true },
    select:  { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  })

  return { persons, techniques }
}

// ── Upcoming expiries (for dashboard alerts) ──────────────────────

export async function getUpcomingExpiries(daysAhead: number = 30) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + daysAhead)

  return prisma.qualificationRecord.findMany({
    where: {
      status:     'APPROVED',
      expiryDate: { lte: cutoff, gte: new Date() },
    },
    select: {
      ...QUALIFICATION_SELECT,
    },
    orderBy: { expiryDate: 'asc' },
  })
}

// ── Get persons and techniques for form dropdowns ─────────────────

export async function getPersonsAndTechniques() {
  const [persons, techniques, departments] = await Promise.all([
    prisma.person.findMany({
      where:   { isActive: true },
      select:  { id: true, name: true, employeeId: true, designation: true },
      orderBy: { name: 'asc' },
    }),
    prisma.technique.findMany({
      where:   { isActive: true },
      select:  { id: true, name: true, code: true, type: true },
      orderBy: { name: 'asc' },
    }),
    prisma.department.findMany({
      where:   { isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return { persons, techniques, departments }
}

// ── Helper — generate unique certificate number ───────────────────

async function generateCertNumber(
  tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
): Promise<string> {
  const year  = new Date().getFullYear()
  const count = await tx.certificate.count({
    where: {
      issuedAt: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      },
    },
  })
  const seq = String(count + 1).padStart(5, '0')
  return `CERT-${year}-${seq}`
}