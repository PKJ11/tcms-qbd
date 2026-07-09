'use server'

import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import { createPersonSchema, updatePersonSchema } from './schema'
import type { CreatePersonInput, UpdatePersonInput } from './types'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { autoAssignInductionTraining } from '@/modules/assignments'
import { sendEmail } from '@/lib/email'
import type { UserRole as PrismaUserRole } from '@prisma/client'

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
  department: { select: { id: true, name: true } },
  section: { select: { id: true, name: true } },
  manager: { select: { id: true, name: true } },
} as const

// ── Get all persons ───────────────────────────────────────────────

export async function getPersons(filters?: {
  subordinateIds?: string[]
  departmentId?:   string
  sectionId?:      string
  role?:           string
  isActive?:       boolean
  search?:         string
}) {
  return prisma.person.findMany({
    where: {
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.subordinateIds && filters.subordinateIds.length > 0
        ? { id: { in: filters.subordinateIds } }
        : {
            ...(filters?.departmentId && { departmentId: filters.departmentId }),
            ...(filters?.sectionId    && { sectionId:    filters.sectionId    }),
          }
      ),
      ...(filters?.role && { role: filters.role as PrismaUserRole }),
      ...(filters?.search && {
        OR: [
          { name:       { contains: filters.search, mode: 'insensitive' } },
          { employeeId: { contains: filters.search, mode: 'insensitive' } },
          { email:      { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    },
    select: {
      id: true,
      employeeId: true,
      name: true,
      email: true,
      role: true,
      designation: true,
      isActive: true,
      joiningDate: true,
      lastLoginAt: true,
      department: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
    },
    orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
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

  const existingEmpId = await prisma.person.findUnique({
    where: { employeeId: input.employeeId.trim().toUpperCase() },
  })
  if (existingEmpId) {
    throw new Error(`Employee ID ${input.employeeId} is already in use`)
  }

  if (input.email?.trim()) {
    const existingEmail = await prisma.person.findFirst({
      where: { email: input.email.trim().toLowerCase() },
    })
    if (existingEmail) {
      throw new Error('An account with this email address already exists')
    }
  }

  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  const person = await prisma.person.create({
    data: {
      employeeId: input.employeeId.trim().toUpperCase(),
      name: input.name,
      email: input.email?.trim().toLowerCase() || null,
      designation: input.designation,
      role: input.role,
      departmentId: input.departmentId,
      sectionId: input.sectionId || null,
      managerId: input.managerId || null,
      joiningDate: input.joiningDate ? new Date(input.joiningDate) : new Date(),
      passwordHash,
      mustChangePassword: true,
    },
    select: {
      id: true,
      employeeId: true,
      name: true,
      email: true,
      department: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
    },
  })

  // Send email only if email provided
  if (person.email) {
    try {
      await sendEmail({
        to: person.email,
        subject: 'Your TCMS account has been created',
        html: (person.name, person.employeeId, tempPassword),
      })
    } catch (error) {
      console.error('[EMAIL ERROR]', error)
    }
  }

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
      department: person.department?.name,
      section: person.section?.name ?? 'none',
    },
    justification,
  })

  if (person.department) {
    try {
      await autoAssignInductionTraining(
        person.id,
        person.department.id,
        actorId
      )
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
      ...(input.name !== undefined && { name: input.name }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.designation !== undefined && {
        designation: input.designation,
      }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.departmentId !== undefined && {
        departmentId: input.departmentId?.trim() || null,
      }),
      ...(input.sectionId !== undefined && {
        sectionId: input.sectionId?.trim() || null,
      }),
      ...(input.managerId !== undefined && {
        managerId: input.managerId?.trim() || null,
      }),
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

// Get departments
export async function getDepartmentsAndSections() {
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      code: true,
      sections: {
        where: { isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  return departments
}
