'use server'

import { prisma }        from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import { hasAnyRole } from '@/lib/permissions'

// ── Generate unique trainer cert number ───────────────────────────

async function generateTrainerCertNumber(): Promise<string> {
  const year  = new Date().getFullYear()
  const count = await prisma.trainerCertificate.count({
    where: {
      issuedAt: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      },
    },
  })
  return `TR-CERT-${year}-${String(count + 1).padStart(4, '0')}`
}

// ── Get all trainer certificates ──────────────────────────────────

export async function getTrainerCertificates(filters?: {
  isActive?: boolean
  personId?: string
}) {
  const where: Record<string, unknown> = {}
  if (filters?.isActive !== undefined) where.isActive = filters.isActive
  if (filters?.personId)               where.personId = filters.personId

  return prisma.trainerCertificate.findMany({
    where,
    select: {
      id:           true,
      certNumber:   true,
      basis:        true,
      isActive:     true,
      issuedAt:     true,
      revokedAt:    true,
      revokedReason: true,
      person:   { select: { id: true, name: true, employeeId: true, designation: true } },
      issuedBy: { select: { id: true, name: true } },
      revokedBy: { select: { id: true, name: true } },
    },
    orderBy: { issuedAt: 'desc' },
  })
}

// ── Issue trainer certificate ─────────────────────────────────────
// Per SOP: issued by a Trainer / Guest Trainer

export async function issueTrainerCertificate(
  input: {
    personId: string
    basis:    string   // e.g. "5+ years industry experience in HPLC"
  },
  justification: string,
  actorId:       string
) {
  // Only Trainer / Guest Trainer can issue
  const actor = await prisma.person.findUnique({
    where:  { id: actorId },
    select: { roles: { select: { role: true } } },
  })
  if (!actor || !hasAnyRole({ roles: actor.roles.map((r) => r.role) }, ['TRAINER', 'GUEST_TRAINER'])) {
    throw new Error('Only a Trainer can issue Trainer Certificates')
  }

  // Check if person already has an active cert
  const existing = await prisma.trainerCertificate.findFirst({
    where: { personId: input.personId, isActive: true },
  })
  if (existing) throw new Error('This person already has an active Trainer Certificate')

  const person = await prisma.person.findUnique({
    where:  { id: input.personId },
    select: { id: true, name: true, isActive: true },
  })
  if (!person)          throw new Error('Person not found')
  if (!person.isActive) throw new Error('Person is inactive')

  const certNumber = await generateTrainerCertNumber()

  const cert = await prisma.trainerCertificate.create({
    data: {
      personId:   input.personId,
      issuedById: actorId,
      certNumber,
      basis:      input.basis,
    },
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'CREATE',
    module:        'ADMIN',
    recordId:      cert.id,
    recordType:    'TrainerCertificate',
    beforeValue:   null,
    afterValue:    {
      personName: person.name,
      certNumber,
      basis:      input.basis,
    },
    justification,
  })

  return cert
}

// ── Revoke trainer certificate ────────────────────────────────────

export async function revokeTrainerCertificate(
  certId:        string,
  reason:        string,
  justification: string,
  actorId:       string
) {
  const cert = await prisma.trainerCertificate.findUnique({
    where:  { id: certId },
    select: { id: true, isActive: true, personId: true, certNumber: true },
  })
  if (!cert)           throw new Error('Certificate not found')
  if (!cert.isActive)  throw new Error('Certificate is already revoked')

  await prisma.trainerCertificate.update({
    where: { id: certId },
    data:  {
      isActive:      false,
      revokedAt:     new Date(),
      revokedById:   actorId,
      revokedReason: reason,
    },
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'REVOKE',
    module:        'ADMIN',
    recordId:      certId,
    recordType:    'TrainerCertificate',
    beforeValue:   { isActive: true,  certNumber: cert.certNumber },
    afterValue:    { isActive: false, revokedReason: reason },
    justification,
  })
}

// ── Get all persons eligible to become trainers ───────────────────

export async function getEligibleTrainers() {
  const persons = await prisma.person.findMany({
    where: { isActive: true },
    select: {
      id:          true,
      name:        true,
      employeeId:  true,
      designation: true,
      roles:       { select: { role: true } },
      department:  { select: { name: true } },
      trainerCertificates: {
        where:  { isActive: true },
        select: { id: true, certNumber: true },
        take:   1,
      },
    },
    orderBy: { name: 'asc' },
  })

  return persons.map((p) => ({ ...p, roles: p.roles.map((r) => r.role) }))
}