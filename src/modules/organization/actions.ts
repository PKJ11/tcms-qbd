'use server'

import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'

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
  input: { name: string; code: string; departmentId: string },
  justification: string,
  actorId: string
) {
  const name = input.name.trim()
  const code = input.code.trim().toUpperCase()

  if (!name) throw new Error('Unit name is required')
  if (!code) throw new Error('Unit code is required')

  const department = await prisma.department.findUnique({
    where:  { id: input.departmentId },
    select: { id: true, name: true },
  })
  if (!department) throw new Error('Department not found')

  const existing = await prisma.unit.findUnique({
    where: { departmentId_code: { departmentId: input.departmentId, code } },
  })
  if (existing) throw new Error(`Unit code "${code}" already exists in ${department.name}`)

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
  input: { name: string; code: string; unitId: string },
  justification: string,
  actorId: string
) {
  const name = input.name.trim()
  const code = input.code.trim().toUpperCase()

  if (!name) throw new Error('Section name is required')
  if (!code) throw new Error('Section code is required')

  const unit = await prisma.unit.findUnique({
    where:  { id: input.unitId },
    select: { id: true, name: true, department: { select: { name: true } } },
  })
  if (!unit) throw new Error('Unit not found')

  const existing = await prisma.section.findUnique({
    where: { unitId_code: { unitId: input.unitId, code } },
  })
  if (existing) throw new Error(`Section code "${code}" already exists in ${unit.name}`)

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
