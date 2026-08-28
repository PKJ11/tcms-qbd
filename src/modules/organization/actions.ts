'use server'

import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import { verifyUserPassword } from '@/lib/auth'

// ── Auto-generated codes — derived from name, de-duplicated on collision ──

function slugifyCode(name: string, maxLen = 12): string {
  const cleaned = name.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return cleaned.slice(0, maxLen) || 'X'
}

async function generateUnitCode(departmentId: string, name: string): Promise<string> {
  const base = slugifyCode(name)
  let code = base
  let n = 2
  while (await prisma.unit.findUnique({ where: { departmentId_code: { departmentId, code } } })) {
    code = `${base}${n}`
    n++
  }
  return code
}

async function generateSectionCode(unitId: string, name: string): Promise<string> {
  const base = slugifyCode(name)
  let code = base
  let n = 2
  while (await prisma.section.findUnique({ where: { unitId_code: { unitId, code } } })) {
    code = `${base}${n}`
    n++
  }
  return code
}

async function generateDepartmentCode(name: string): Promise<string> {
  const base = slugifyCode(name)
  let code = base
  let n = 2
  while (await prisma.department.findUnique({ where: { code } })) {
    code = `${base}${n}`
    n++
  }
  return code
}

// ── Get full Department → Unit → Section tree ──────────────────────

export async function getDepartmentTree() {
  return prisma.department.findMany({
    where: { isActive: true },
    select: {
      id:   true,
      name: true,
      code: true,
      units: {
        where:  { isActive: true },
        select: {
          id:   true,
          name: true,
          code: true,
          sections: {
            where:   { isActive: true },
            select:  { id: true, name: true, code: true },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })
}

// ── Create a Department ───────────────────────────────────────────

export async function createDepartment(
  input: { name: string },
  justification: string,
  actorId: string,
  password: string
) {
  const passwordValid = await verifyUserPassword(actorId, password)
  if (!passwordValid) throw new Error('Incorrect password')

  const name = input.name.trim()
  if (!name) throw new Error('Department name is required')

  // A department name is globally unique. If a soft-deleted one exists with
  // the same name, reactivate it rather than hitting the unique constraint.
  const existing = await prisma.department.findFirst({
    where:  { name: { equals: name, mode: 'insensitive' } },
    select: { id: true, isActive: true },
  })
  if (existing?.isActive) throw new Error(`Department "${name}" already exists`)

  const department = existing
    ? await prisma.department.update({
        where: { id: existing.id },
        data:  { name, isActive: true },
      })
    : await prisma.department.create({
        data: { name, code: await generateDepartmentCode(name) },
      })

  await logAuditEvent({
    userId:        actorId,
    action:        'CREATE',
    module:        'ORGANIZATION',
    recordId:      department.id,
    recordType:    'Department',
    beforeValue:   null,
    afterValue:    { name: department.name, code: department.code },
    justification,
  })

  return department
}

// ── Delete (deactivate) a Department ──────────────────────────────

export async function deleteDepartment(
  id: string,
  justification: string,
  actorId: string,
  password: string
) {
  const passwordValid = await verifyUserPassword(actorId, password)
  if (!passwordValid) throw new Error('Incorrect password')

  const department = await prisma.department.findUnique({
    where:  { id },
    select: { id: true, name: true, code: true },
  })
  if (!department) throw new Error('Department not found')

  const activeUnits = await prisma.unit.count({ where: { departmentId: id, isActive: true } })
  if (activeUnits > 0) {
    throw new Error('Delete all units in this department first')
  }
  const activePersons = await prisma.person.count({ where: { departmentId: id, isActive: true } })
  if (activePersons > 0) {
    throw new Error('This department still has active members assigned')
  }

  await prisma.department.update({ where: { id }, data: { isActive: false } })

  await logAuditEvent({
    userId:        actorId,
    action:        'DELETE',
    module:        'ORGANIZATION',
    recordId:      id,
    recordType:    'Department',
    beforeValue:   { name: department.name, code: department.code },
    afterValue:    null,
    justification,
  })

  return { id }
}

// ── Create a Unit within a Department ──────────────────────────────

export async function createUnit(
  input: { name: string; departmentId: string },
  justification: string,
  actorId: string,
  password: string
) {
  const passwordValid = await verifyUserPassword(actorId, password)
  if (!passwordValid) throw new Error('Incorrect password')

  const name = input.name.trim()

  if (!name) throw new Error('Unit name is required')

  const department = await prisma.department.findUnique({
    where:  { id: input.departmentId },
    select: { id: true, name: true },
  })
  if (!department) throw new Error('Department not found')

  const code = await generateUnitCode(input.departmentId, name)

  const unit = await prisma.unit.create({
    data: { name, code, departmentId: input.departmentId },
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'CREATE',
    module:        'ORGANIZATION',
    recordId:      unit.id,
    recordType:    'Unit',
    beforeValue:   null,
    afterValue:    { name: unit.name, code: unit.code, department: department.name },
    justification,
  })

  return unit
}

// ── Delete (deactivate) a Unit ───────────────────────────────────

export async function deleteUnit(
  id: string,
  justification: string,
  actorId: string,
  password: string
) {
  const passwordValid = await verifyUserPassword(actorId, password)
  if (!passwordValid) throw new Error('Incorrect password')

  const unit = await prisma.unit.findUnique({
    where:  { id },
    select: { id: true, name: true, code: true, department: { select: { name: true } } },
  })
  if (!unit) throw new Error('Unit not found')

  const activeSections = await prisma.section.count({ where: { unitId: id, isActive: true } })
  if (activeSections > 0) {
    throw new Error('Delete all sections in this unit first')
  }
  const activePersons = await prisma.person.count({ where: { unitId: id, isActive: true } })
  if (activePersons > 0) {
    throw new Error('This unit still has active members assigned')
  }

  await prisma.unit.update({ where: { id }, data: { isActive: false } })

  await logAuditEvent({
    userId:        actorId,
    action:        'DELETE',
    module:        'ORGANIZATION',
    recordId:      id,
    recordType:    'Unit',
    beforeValue:   { name: unit.name, code: unit.code, department: unit.department.name },
    afterValue:    null,
    justification,
  })

  return { id }
}

// ── Create a Section within a Unit ─────────────────────────────────

export async function createSection(
  input: { name: string; unitId: string },
  justification: string,
  actorId: string,
  password: string
) {
  const passwordValid = await verifyUserPassword(actorId, password)
  if (!passwordValid) throw new Error('Incorrect password')

  const name = input.name.trim()

  if (!name) throw new Error('Section name is required')

  const unit = await prisma.unit.findUnique({
    where:  { id: input.unitId },
    select: { id: true, name: true, department: { select: { name: true } } },
  })
  if (!unit) throw new Error('Unit not found')

  const code = await generateSectionCode(input.unitId, name)

  const section = await prisma.section.create({
    data: { name, code, unitId: input.unitId },
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'CREATE',
    module:        'ORGANIZATION',
    recordId:      section.id,
    recordType:    'Section',
    beforeValue:   null,
    afterValue:    { name: section.name, code: section.code, unit: unit.name, department: unit.department.name },
    justification,
  })

  return section
}

// ── Delete (deactivate) a Section ─────────────────────────────────

export async function deleteSection(
  id: string,
  justification: string,
  actorId: string,
  password: string
) {
  const passwordValid = await verifyUserPassword(actorId, password)
  if (!passwordValid) throw new Error('Incorrect password')

  const section = await prisma.section.findUnique({
    where:  { id },
    select: { id: true, name: true, code: true, unit: { select: { name: true } } },
  })
  if (!section) throw new Error('Section not found')

  const activePersons = await prisma.person.count({ where: { sectionId: id, isActive: true } })
  if (activePersons > 0) {
    throw new Error('This section still has active members assigned')
  }

  await prisma.section.update({ where: { id }, data: { isActive: false } })

  await logAuditEvent({
    userId:        actorId,
    action:        'DELETE',
    module:        'ORGANIZATION',
    recordId:      id,
    recordType:    'Section',
    beforeValue:   { name: section.name, code: section.code, unit: section.unit.name },
    afterValue:    null,
    justification,
  })

  return { id }
}
