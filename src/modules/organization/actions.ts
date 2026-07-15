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
