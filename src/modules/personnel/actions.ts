'use server'

import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import { createPersonSchema, updatePersonSchema } from './schema'
import type { CreatePersonInput, UpdatePersonInput } from './types'
import type { AppRole } from '@/lib/types'
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
  roles: { select: { role: true } },
  designation: true,
  isActive: true,
  joiningDate: true,
  lastLoginAt: true,
  department: { select: { id: true, name: true } },
  unit: { select: { id: true, name: true } },
  section: { select: { id: true, name: true } },
  manager: { select: { id: true, name: true } },
} as const

// Server-side auto-increment for Guest (G-XXX) and Contractual (CR-XXX) IDs.
// Never trust a client-supplied employeeId for these two employee types.
async function getNextSequentialId(prefix: 'G' | 'CR'): Promise<string> {
  const existing = await prisma.person.findMany({
    where:  { employeeId: { startsWith: `${prefix}-` } },
    select: { employeeId: true },
  })
  const max = existing
    .map((p) => parseInt(p.employeeId.slice(prefix.length + 1), 10))
    .filter((n) => !isNaN(n))
    .reduce((m, n) => Math.max(m, n), 0)
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

// ── Get all persons ───────────────────────────────────────────────

export async function getPersons(filters?: {
  subordinateIds?: string[]
  departmentId?:   string
  unitId?:         string
  sectionId?:      string
  role?:           string
  isActive?:       boolean
  search?:         string
}) {
  const persons = await prisma.person.findMany({
    where: {
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.subordinateIds && filters.subordinateIds.length > 0
        ? { id: { in: filters.subordinateIds } }
        : {
            ...(filters?.departmentId && { departmentId: filters.departmentId }),
            ...(filters?.unitId       && { unitId:       filters.unitId       }),
            ...(filters?.sectionId    && { sectionId:    filters.sectionId    }),
          }
      ),
      ...(filters?.role && { roles: { some: { role: filters.role as AppRole } } }),
      ...(filters?.search && {
        OR: [
          { name:       { contains: filters.search, mode: 'insensitive' } },
          { employeeId: { contains: filters.search, mode: 'insensitive' } },
          { email:      { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    },
    select: PERSON_SELECT,
    orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
  })

  return persons.map((p) => ({ ...p, roles: p.roles.map((r) => r.role) }))
}

// ── Get single person ─────────────────────────────────────────────

export async function getPersonById(id: string) {
  const person = await prisma.person.findUnique({
    where: { id },
    select: {
      ...PERSON_SELECT,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
      subordinates: {
        select: { id: true, name: true, roles: { select: { role: true } } },
      },
    },
  })

  if (!person) return null

  return {
    ...person,
    roles: person.roles.map((r) => r.role),
    subordinates: person.subordinates.map((s) => ({
      ...s,
      roles: s.roles.map((r) => r.role),
    })),
  }
}

// ── Create person ─────────────────────────────────────────────────

export async function createPerson(
  input: CreatePersonInput,
  justification: string,
  actorId: string
) {
  const parsed = createPersonSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.message)
  const data = parsed.data

  if (data.email?.trim()) {
    const existingEmail = await prisma.person.findFirst({
      where: { email: data.email.trim().toLowerCase() },
    })
    if (existingEmail) {
      throw new Error('An account with this email address already exists')
    }
  }

  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  // Resolve employeeId + final role set per employee type
  let employeeId: string
  let roles: AppRole[]

  if (data.employeeType === 'QBD') {
    employeeId = data.employeeId.trim()
    roles      = data.roles

    const existingEmpId = await prisma.person.findUnique({ where: { employeeId } })
    if (existingEmpId) throw new Error(`Employee ID ${employeeId} is already in use`)
  } else if (data.employeeType === 'GUEST') {
    roles = ['GUEST_TRAINER']
  } else {
    roles = ['CONTRACTUAL_EMPLOYEE', ...data.roles]
  }

  const baseData = {
    name:               data.name,
    email:              data.email?.trim().toLowerCase() || null,
    designation:        data.designation,
    departmentId:       data.departmentId,
    unitId:             data.unitId,
    sectionId:          data.sectionId || null,
    managerId:          data.managerId || null,
    joiningDate:        data.joiningDate ? new Date(data.joiningDate) : new Date(),
    passwordHash,
    mustChangePassword: true,
  }

  const personSelect = {
    id: true,
    employeeId: true,
    name: true,
    email: true,
    department: { select: { id: true, name: true } },
    unit:       { select: { id: true, name: true } },
    section:    { select: { id: true, name: true } },
  } as const

  type CreatedPerson = {
    id: string
    employeeId: string
    name: string
    email: string | null
    department: { id: string; name: string } | null
    unit:       { id: string; name: string } | null
    section:    { id: string; name: string } | null
  }

  let person: CreatedPerson

  if (data.employeeType === 'QBD') {
    person = await prisma.person.create({
      data: {
        ...baseData,
        employeeId: employeeId!,
        roles: { create: roles.map((role) => ({ role })) },
      },
      select: personSelect,
    })
  } else {
    // Guest / Contractual — server generates the sequential ID.
    // Retry on unique-constraint race if two admins create one concurrently.
    const prefix = data.employeeType === 'GUEST' ? 'G' : 'CR'
    let attempts = 0
    while (true) {
      attempts++
      const candidateId = await getNextSequentialId(prefix)
      try {
        person = await prisma.person.create({
          data: {
            ...baseData,
            employeeId: candidateId,
            roles: { create: roles.map((role) => ({ role })) },
          },
          select: personSelect,
        })
        break
      } catch (error) {
        const isUniqueConflict =
          error instanceof Object && (error as { code?: string }).code === 'P2002'
        if (isUniqueConflict && attempts < 5) continue
        throw error
      }
    }
  }

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
      roles,
      department: person.department?.name,
      unit: person.unit?.name,
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
  const parsed = updatePersonSchema.safeParse({ id, ...input })
  if (!parsed.success) {
    throw new Error(parsed.error.message)
  }

  // Snapshot before
  const before = await prisma.person.findUnique({
    where: { id },
    select: PERSON_SELECT,
  })

  if (!before) throw new Error('Person not found')

  if (input.roles !== undefined) {
    await prisma.personRole.deleteMany({ where: { personId: id } })
  }

  // Update
  const after = await prisma.person.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.designation !== undefined && {
        designation: input.designation,
      }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.departmentId !== undefined && {
        departmentId: input.departmentId,
      }),
      ...(input.unitId !== undefined && {
        unitId: input.unitId,
      }),
      ...(input.sectionId !== undefined && {
        sectionId: input.sectionId?.trim() || null,
      }),
      ...(input.managerId !== undefined && {
        managerId: input.managerId?.trim() || null,
      }),
      ...(input.roles !== undefined && {
        roles: { create: input.roles.map((role) => ({ role })) },
      }),
    },
    select: PERSON_SELECT,
  })

  const beforeFlat = { ...before, roles: before.roles.map((r) => r.role) }
  const afterFlat  = { ...after,  roles: after.roles.map((r) => r.role) }

  // Audit log with before/after
  await logAuditEvent({
    userId: actorId,
    action: 'UPDATE',
    module: 'PERSONNEL',
    recordId: id,
    recordType: 'Person',
    beforeValue: {
      name: beforeFlat.name,
      roles: beforeFlat.roles,
      designation: beforeFlat.designation,
      isActive: beforeFlat.isActive,
    },
    afterValue: {
      name: afterFlat.name,
      roles: afterFlat.roles,
      designation: afterFlat.designation,
      isActive: afterFlat.isActive,
    },
    justification,
  })

  return afterFlat
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

// Get departments → units → sections (for cascading selects)
export async function getDepartmentsUnitsAndSections() {
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      code: true,
      units: {
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
      },
    },
    orderBy: { name: 'asc' },
  })

  return departments
}
