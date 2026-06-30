'use server'

import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import { createPersonSchema, updatePersonSchema } from './schema'
import type { CreatePersonInput, UpdatePersonInput } from './types'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { autoAssignInductionTraining } from '@/modules/assignments'
import { sendEmail } from '@/lib/email'

// ── Helpers ───────────────────────────────────────────────────────

function generateTempPassword(): string {
  return crypto.randomBytes(8).toString('hex') // e.g. "a3f9d2c1b7e4f012"
}

const PERSON_SELECT = {
  id: true,
  employeeId: true,
  name: true,
  email: true,
  role: true,
  designation: true,
  isActive: true,
  joiningDate: true,
  lastLoginAt: true,
  unit: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  manager: { select: { id: true, name: true } },
} as const

// ── Get all persons ───────────────────────────────────────────────

export async function getPersons(filters?: {
  unitId?: string
  departmentId?: string
  role?: string
  isActive?: boolean
  search?: string
}) {
  const where: Record<string, unknown> = {}

  if (filters?.unitId) where.unitId = filters.unitId
  if (filters?.departmentId) where.departmentId = filters.departmentId
  if (filters?.role) where.role = filters.role
  if (filters?.isActive !== undefined) where.isActive = filters.isActive

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { employeeId: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  return prisma.person.findMany({
    where,
    select: PERSON_SELECT,
    orderBy: { name: 'asc' },
  })
}

// ── Get single person ─────────────────────────────────────────────

export async function getPersonById(id: string) {
  return prisma.person.findUnique({
    where: { id },
    select: {
      ...PERSON_SELECT,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
      subordinates: {
        select: { id: true, name: true, role: true },
      },
    },
  })
}

// ── Create person ─────────────────────────────────────────────────

export async function createPerson(
  input: CreatePersonInput,
  justification: string,
  actorId: string
) {
  // Validate
  const parsed = createPersonSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.message)
  }

  // Check duplicates
  const existing = await prisma.person.findFirst({
    where: {
      OR: [{ email: input.email }, { employeeId: input.employeeId }],
    },
  })

  if (existing) {
    throw new Error(
      existing.email === input.email
        ? 'Email already exists'
        : 'Employee ID already exists'
    )
  }

  // Generate temp password
  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  // Create person
  const person = await prisma.person.create({
    data: {
      employeeId: input.employeeId,
      name: input.name,
      email: input.email,
      passwordHash,
      mustChangePassword: true,
      role: input.role,
      designation: input.designation,
      joiningDate: new Date(input.joiningDate),
      unitId: input.unitId,
      departmentId: input.departmentId?.trim() || null,
      managerId: input.managerId?.trim() || null,
    },
    select: PERSON_SELECT,
  })

  // Audit log
  await logAuditEvent({
    userId: actorId,
    action: 'CREATE',
    module: 'PERSONNEL',
    recordId: person.id,
    recordType: 'Person',
    beforeValue: null,
    afterValue: {
      employeeId: person.employeeId,
      name: person.name,
      email: person.email,
      role: person.role,
      designation: person.designation,
    },
    justification,
  })

  // Send welcome email with temp password
  try {
    await sendEmail({
      to: person.email,
      subject: 'Your TCMS account has been created',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#2d6a4f">Welcome to TCMS</h2>
          <p>Dear ${person.name},</p>
          <p>Your Training & Competency Management System account has been created.</p>
          <table style="background:#f9fafb;border-radius:8px;padding:16px;width:100%">
            <tr><td><strong>Email:</strong></td><td>${person.email}</td></tr>
            <tr><td><strong>Temporary password:</strong></td><td style="font-family:monospace;font-size:16px">${tempPassword}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:13px;margin-top:16px">
            You will be required to change this password on first login.
          </p>
          <p style="color:#6b7280;font-size:12px">
            TCMS · QbD Research & Development Lab Pvt. Ltd.
          </p>
        </div>
      `,
    })
  } catch {
    // Email failure must not block person creation
    console.error('[EMAIL ERROR] Failed to send welcome email')
  }

  // Auto-assign induction training based on department
  if (person.department) {
    try {
      await autoAssignInductionTraining(
        person.id,
        person.department.id,
        actorId
      )
    } catch (error) {
      // Do not block person creation if auto-assignment fails
      console.error('[AUTO-ASSIGN ERROR]', error)
    }
  }


  return { person, tempPassword }
}

// ── Update person ─────────────────────────────────────────────────

export async function updatePerson(
  id: string,
  input: UpdatePersonInput,
  justification: string,
  actorId: string
) {
  const parsed = updatePersonSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.message)
  }

  // Snapshot before
  const before = await prisma.person.findUnique({
    where: { id },
    select: PERSON_SELECT,
  })

  if (!before) throw new Error('Person not found')

  // Update
  const after = await prisma.person.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.role && { role: input.role }),
      ...(input.designation && { designation: input.designation }),
      ...(input.unitId && { unitId: input.unitId }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      departmentId: input.departmentId?.trim() || null,
      managerId: input.managerId?.trim() || null,
    },
    select: PERSON_SELECT,
  })

  // Audit log with before/after
  await logAuditEvent({
    userId: actorId,
    action: 'UPDATE',
    module: 'PERSONNEL',
    recordId: id,
    recordType: 'Person',
    beforeValue: {
      name: before.name,
      role: before.role,
      designation: before.designation,
      isActive: before.isActive,
    },
    afterValue: {
      name: after.name,
      role: after.role,
      designation: after.designation,
      isActive: after.isActive,
    },
    justification,
  })

  return after
}

// ── Deactivate person (soft delete) ──────────────────────────────

export async function deactivatePerson(
  id: string,
  justification: string,
  actorId: string
) {
  const person = await prisma.person.findUnique({
    where: { id },
    select: { id: true, name: true, isActive: true },
  })

  if (!person) throw new Error('Person not found')
  if (!person.isActive) throw new Error('Person is already inactive')

  await prisma.person.update({
    where: { id },
    data: { isActive: false },
  })

  await logAuditEvent({
    userId: actorId,
    action: 'DELETE',
    module: 'PERSONNEL',
    recordId: id,
    recordType: 'Person',
    beforeValue: { isActive: true, name: person.name },
    afterValue: { isActive: false, name: person.name },
    justification,
  })
}

// ── Reset password (by admin) ─────────────────────────────────────

export async function resetPersonPassword(
  id: string,
  justification: string,
  actorId: string
) {
  const person = await prisma.person.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  })

  if (!person) throw new Error('Person not found')

  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  await prisma.person.update({
    where: { id },
    data: {
      passwordHash,
      mustChangePassword: true,
    },
  })

  await logAuditEvent({
    userId: actorId,
    action: 'UPDATE',
    module: 'PERSONNEL',
    recordId: id,
    recordType: 'Person',
    beforeValue: null,
    afterValue: { passwordReset: true, mustChangePassword: true },
    justification,
  })

  // Email new temp password
  try {
    await sendEmail({
      to: person.email,
      subject: 'Your TCMS password has been reset',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#2d6a4f">Password Reset</h2>
          <p>Dear ${person.name},</p>
          <p>Your TCMS password has been reset by an administrator.</p>
          <table style="background:#f9fafb;border-radius:8px;padding:16px;width:100%">
            <tr>
              <td><strong>New temporary password:</strong></td>
              <td style="font-family:monospace;font-size:16px">${tempPassword}</td>
            </tr>
          </table>
          <p style="color:#6b7280;font-size:13px;margin-top:16px">
            You will be required to change this password on next login.
          </p>
        </div>
      `,
    })
  } catch {
    console.error('[EMAIL ERROR] Failed to send password reset email')
  }

  return tempPassword
}

// ── Get units and departments for dropdowns ───────────────────────

export async function getUnitsAndDepartments() {
  const [units, departments] = await Promise.all([
    prisma.unit.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { unit: { select: { id: true, name: true } } },
    }),
  ])

  return { units, departments }
}
