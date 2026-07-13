'use server'

import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import { getDepartmentTree } from '@/modules/organization'
import { createTopicSchema, updateTopicSchema } from './schema'
import type { CreateTopicInput, UpdateTopicInput, TopicScopeItem } from './types'

// ── Shared select ─────────────────────────────────────────────────

const TOPIC_SELECT = {
  id:           true,
  name:         true,
  description:  true,
  trainingType: true,
  isActive:     true,
  createdAt:    true,
  createdBy: {
    select: { id: true, name: true },
  },
  topicScopes: {
    select: {
      department: { select: { id: true, name: true } },
      unit:       { select: { id: true, name: true } },
      section:    { select: { id: true, name: true } },
    },
  },
  _count: {
    select: {
      assignments: true,
      materials:   true,
    },
  },
} as const

// Validate every scope's department/unit/section actually exist and nest correctly
async function validateScopes(scopes: TopicScopeItem[]) {
  for (const scope of scopes) {
    const department = await prisma.department.findUnique({ where: { id: scope.departmentId } })
    if (!department) throw new Error('One or more departments not found')

    if (scope.unitId) {
      const unit = await prisma.unit.findUnique({ where: { id: scope.unitId } })
      if (!unit || unit.departmentId !== scope.departmentId) {
        throw new Error('Selected unit does not belong to the selected department')
      }
    }

    if (scope.sectionId) {
      if (!scope.unitId) throw new Error('A unit must be selected to scope by section')
      const section = await prisma.section.findUnique({ where: { id: scope.sectionId } })
      if (!section || section.unitId !== scope.unitId) {
        throw new Error('Selected section does not belong to the selected unit')
      }
    }
  }
}

// ── Get all topics ────────────────────────────────────────────────

export async function getTopics(filters?: {
  departmentId?: string
  isActive?:     boolean
  search?:       string
}) {
  const where: Record<string, unknown> = {}

  if (filters?.isActive !== undefined) {
    where.isActive = filters.isActive
  }

  if (filters?.search) {
    where.OR = [
      { name:        { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  if (filters?.departmentId) {
    where.topicScopes = {
      some: { departmentId: filters.departmentId },
    }
  }

  return prisma.trainingTopic.findMany({
    where,
    select:  TOPIC_SELECT,
    orderBy: { name: 'asc' },
  })
}

// ── Get single topic ──────────────────────────────────────────────

export async function getTopicById(id: string) {
  return prisma.trainingTopic.findUnique({
    where:  { id },
    select: {
      ...TOPIC_SELECT,
      questionBank: {
        select: {
          id:                  true,
          passingPercentage:   true,
          questionsPerAttempt: true,
          maxAttempts:         true,
          isActive:            true,
          _count: {
            select: { questions: true },
          },
        },
      },
      materials: {
        select: {
          id:             true,
          title:          true,
          currentVersion: true,
          status:         true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

// ── Create topic ──────────────────────────────────────────────────

export async function createTopic(
  input:         CreateTopicInput,
  justification: string,
  actorId:       string
) {
  // Validate
  const parsed = createTopicSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.message)
  }

  // Check duplicate name
  const existing = await prisma.trainingTopic.findFirst({
    where: { name: { equals: input.name, mode: 'insensitive' } },
  })
  if (existing) throw new Error('A topic with this name already exists')

  await validateScopes(input.scopes)

  // Create topic + scope mappings in a transaction
  const topic = await prisma.$transaction(async (tx) => {
    const created = await tx.trainingTopic.create({
      data: {
        name:         input.name,
        description:  input.description ?? null,
        trainingType: input.trainingType ?? 'MATERIAL_MCQ',
        createdById:  actorId,
      },
      select: { id: true, name: true },
    })

    await tx.topicScope.createMany({
      data: input.scopes.map((s) => ({
        topicId:      created.id,
        departmentId: s.departmentId,
        unitId:       s.unitId    ?? null,
        sectionId:    s.sectionId ?? null,
      })),
    })

    return created
  })

  // Audit log
  await logAuditEvent({
    userId:        actorId,
    action:        'CREATE',
    module:        'TRAINING_TOPIC',
    recordId:      topic.id,
    recordType:    'TrainingTopic',
    beforeValue:   null,
    afterValue:    {
      name:         input.name,
      description:  input.description,
      trainingType: input.trainingType ?? 'MATERIAL_MCQ',
      scopes:       input.scopes,
    },
    justification,
  })

  return topic
}

// ── Update topic ──────────────────────────────────────────────────

export async function updateTopic(
  id:            string,
  input:         UpdateTopicInput,
  justification: string,
  actorId:       string
) {
  const parsed = updateTopicSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.message)
  }

  if (input.scopes) await validateScopes(input.scopes)

  // Snapshot before
  const before = await prisma.trainingTopic.findUnique({
    where:  { id },
    select: {
      name:         true,
      description:  true,
      trainingType: true,
      isActive:     true,
      topicScopes: {
        select: { departmentId: true, unitId: true, sectionId: true },
      },
    },
  })
  if (!before) throw new Error('Topic not found')

  // Update in transaction
  const after = await prisma.$transaction(async (tx) => {
    // Update topic fields
    const updated = await tx.trainingTopic.update({
      where: { id },
      data:  {
        ...(input.name         !== undefined && { name:         input.name         }),
        ...(input.description  !== undefined && { description:  input.description  }),
        ...(input.trainingType !== undefined && { trainingType: input.trainingType }),
        ...(input.isActive     !== undefined && { isActive:     input.isActive     }),
      },
      select: { id: true, name: true },
    })

    // Update scope mappings if provided
    if (input.scopes !== undefined) {
      await tx.topicScope.deleteMany({ where: { topicId: id } })
      await tx.topicScope.createMany({
        data: input.scopes.map((s) => ({
          topicId:      id,
          departmentId: s.departmentId,
          unitId:       s.unitId    ?? null,
          sectionId:    s.sectionId ?? null,
        })),
      })
    }

    return updated
  })

  // Audit log
  await logAuditEvent({
    userId:        actorId,
    action:        'UPDATE',
    module:        'TRAINING_TOPIC',
    recordId:      id,
    recordType:    'TrainingTopic',
    beforeValue:   {
      name:         before.name,
      description:  before.description,
      trainingType: before.trainingType,
      isActive:     before.isActive,
      scopes:       before.topicScopes,
    },
    afterValue:    {
      name:         input.name         ?? before.name,
      description:  input.description  ?? before.description,
      trainingType: input.trainingType ?? before.trainingType,
      isActive:     input.isActive     ?? before.isActive,
      scopes:       input.scopes       ?? before.topicScopes,
    },
    justification,
  })

  return after
}

// ── Deactivate topic ──────────────────────────────────────────────

export async function deactivateTopic(
  id:            string,
  justification: string,
  actorId:       string
) {
  const topic = await prisma.trainingTopic.findUnique({
    where:  { id },
    select: { id: true, name: true, isActive: true },
  })

  if (!topic)          throw new Error('Topic not found')
  if (!topic.isActive) throw new Error('Topic is already inactive')

  await prisma.trainingTopic.update({
    where: { id },
    data:  { isActive: false },
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'DELETE',
    module:        'TRAINING_TOPIC',
    recordId:      id,
    recordType:    'TrainingTopic',
    beforeValue:   { isActive: true,  name: topic.name },
    afterValue:    { isActive: false, name: topic.name },
    justification,
  })
}

// ── Get department → unit → section tree for topic scoping UI ─────

export async function getAllDepartments() {
  return getDepartmentTree()
}
