'use server'

import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import { createTopicSchema, updateTopicSchema } from './schema'
import type { CreateTopicInput, UpdateTopicInput } from './types'

// ── Shared select ─────────────────────────────────────────────────

const TOPIC_SELECT = {
  id:          true,
  name:        true,
  description: true,
  isActive:    true,
  createdAt:   true,
  createdBy: {
    select: { id: true, name: true },
  },
  topicDepartments: {
    select: {
      department: {
        select: {
          id:   true,
          name: true,
          
        },
      },
    },
  },
  _count: {
    select: {
      assignments: true,
      materials:   true,
    },
  },
} as const

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
    where.topicDepartments = {
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

  // Verify all departments exist
  const departments = await prisma.department.findMany({
    where: { id: { in: input.departmentIds } },
    select: { id: true },
  })
  if (departments.length !== input.departmentIds.length) {
    throw new Error('One or more departments not found')
  }

  // Create topic + department mappings in a transaction
  const topic = await prisma.$transaction(async (tx) => {
    const created = await tx.trainingTopic.create({
      data: {
        name:        input.name,
        description: input.description ?? null,
        createdById: actorId,
      },
      select: { id: true, name: true },
    })

    // Create TopicDepartment junction records
    await tx.topicDepartment.createMany({
      data: input.departmentIds.map((departmentId) => ({
        topicId: created.id,
        departmentId,
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
      name:          input.name,
      description:   input.description,
      departmentIds: input.departmentIds,
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

  // Snapshot before
  const before = await prisma.trainingTopic.findUnique({
    where:  { id },
    select: {
      name:        true,
      description: true,
      isActive:    true,
      topicDepartments: {
        select: { departmentId: true },
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
        ...(input.name        !== undefined && { name:        input.name        }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.isActive    !== undefined && { isActive:    input.isActive    }),
      },
      select: { id: true, name: true },
    })

    // Update department mappings if provided
    if (input.departmentIds !== undefined) {
      // Delete existing mappings
      await tx.topicDepartment.deleteMany({
        where: { topicId: id },
      })
      // Create new mappings
      await tx.topicDepartment.createMany({
        data: input.departmentIds.map((departmentId) => ({
          topicId: id,
          departmentId,
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
      name:          before.name,
      description:   before.description,
      isActive:      before.isActive,
      departmentIds: before.topicDepartments.map((d) => d.departmentId),
    },
    afterValue:    {
      name:          input.name        ?? before.name,
      description:   input.description ?? before.description,
      isActive:      input.isActive    ?? before.isActive,
      departmentIds: input.departmentIds ?? before.topicDepartments.map((d) => d.departmentId),
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

// ── Get departments for topic assignment ──────────────────────────

export async function getAllDepartments() {
  return prisma.department.findMany({
    where:   { isActive: true },
    orderBy: { name: 'asc' },
    
  })
}