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
  const parsed = createPersonSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.message)

  // employeeId must be unique
  const existingEmpId = await prisma.person.findUnique({
    where: { employeeId: input.employeeId.trim().toUpperCase() },
  })
  if (existingEmpId) {
    throw new Error(`Employee ID ${input.employeeId} is already in use`)
  }

  // Email uniqueness check — ONLY if email is provided
  if (input.email && input.email.trim()) {
    const existingEmail = await prisma.person.findFirst({
      where: { email: input.email.trim().toLowerCase() },
    })
    if (existingEmail) {
      throw new Error('An account with this email address already exists')
    }
  }

  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  function buildWelcomeEmailHtml(
  name: string,
  employeeId: string,
  tempPassword: string
): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#2d6a4f">Welcome to TCMS</h2>
      <p>Dear ${name},</p>
      <p>Your account has been created on the Training &amp; Competency Management System.</p>
      <table style="background:#f9fafb;border-radius:8px;padding:16px;width:100%">
        <tr>
          <td><strong>Employee ID:</strong></td>
          <td style="font-family:monospace;font-size:16px">${employeeId}</td>
        </tr>
        <tr>
          <td><strong>Temporary password:</strong></td>
          <td style="font-family:monospace;font-size:16px">${tempPassword}</td>
        </tr>
      </table>
      <p style="color:#6b7280;font-size:13px;margin-top:16px">
        You will be required to change this password on first login.
      </p>
    </div>
  `
}

  const person = await prisma.person.create({
    data: {
      employeeId:         input.employeeId.trim().toUpperCase(),
      name:               input.name,
      email:              input.email?.trim().toLowerCase() || null,  // null if empty
      designation:        input.designation,
      role:               input.role,
      unitId:             input.unitId,
      departmentId:       input.departmentId      || null,
      managerId:          input.managerId         || null,
      joiningDate:        input.joiningDate ? new Date(input.joiningDate) : new Date(),
      passwordHash,
      mustChangePassword: true,
    },
    select: {
      id:         true,
      employeeId: true,
      name:       true,
      email:      true,
      department: { select: { id: true, name: true } },
    },
  })

  // Send email ONLY if email address provided
  if (person.email) {
    try {
      await sendEmail({
        to:      person.email,
        subject: 'Your TCMS account has been created',
        html:    buildWelcomeEmailHtml(
          person.name,
          person.employeeId,
          tempPassword
        ),
      })
    } catch (error) {
      console.error('[EMAIL ERROR]', error)
      // Do not block person creation if email fails
    }
  }

  // Log audit
  await logAuditEvent({
    userId:        actorId,
    action:        'CREATE',
    module:        'PERSONNEL',
    recordId:      person.id,
    recordType:    'Person',
    beforeValue:   null,
    afterValue:    {
      employeeId: person.employeeId,
      name:       person.name,
      email:      person.email ?? 'not provided',
    },
    justification,
  })

  // Auto-assign induction training
  if (person.department) {
    try {
      await autoAssignInductionTraining(person.id, person.department.id, actorId)
    } catch (error) {
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

  // Email new temp password — only if an email address is on file
  if (person.email) {
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
