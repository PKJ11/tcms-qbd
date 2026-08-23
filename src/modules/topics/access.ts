'use server'

import { prisma }        from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import { ForbiddenError } from '@/lib/errors'

// ─────────────────────────────────────────────────────────────────
// TOPIC ACCESS CONTROL
//
// Only the trainer who created a topic may upload/manage its training
// material or create/manage its assessment questions — unless they've
// explicitly granted another trainer access via TopicCollaborator. One
// grant covers both material and questions, so it only needs to be set
// up once per topic.
// ─────────────────────────────────────────────────────────────────

const NOT_OWNER_MESSAGE =
  'Only the trainer who created this topic can manage who has access to it'

const NO_EDIT_ACCESS_MESSAGE =
  'Only the trainer who created this topic — or a trainer they have granted access to — can upload material or manage questions for it'

export async function assertTopicContentAccess(topicId: string, actorId: string): Promise<void> {
  const topic = await prisma.trainingTopic.findUnique({
    where:  { id: topicId },
    select: {
      createdById:   true,
      collaborators: { where: { personId: actorId }, select: { id: true } },
    },
  })
  if (!topic) throw new Error('Topic not found')

  const allowed = topic.createdById === actorId || topic.collaborators.length > 0
  if (!allowed) throw new ForbiddenError(NO_EDIT_ACCESS_MESSAGE)
}

async function assertTopicOwner(topicId: string, actorId: string): Promise<{ topicName: string }> {
  const topic = await prisma.trainingTopic.findUnique({
    where:  { id: topicId },
    select: { name: true, createdById: true },
  })
  if (!topic) throw new Error('Topic not found')
  if (topic.createdById !== actorId) throw new ForbiddenError(NOT_OWNER_MESSAGE)
  return { topicName: topic.name }
}

// ─────────────────────────────────────────────────────────────────
// COLLABORATOR MANAGEMENT — owner-only
// ─────────────────────────────────────────────────────────────────

export async function getTopicAccess(topicId: string, actorId: string) {
  const topic = await prisma.trainingTopic.findUnique({
    where:  { id: topicId },
    select: {
      createdById: true,
      createdBy:   { select: { id: true, name: true, employeeId: true } },
      collaborators: {
        select: {
          id:        true,
          createdAt: true,
          person:    { select: { id: true, name: true, employeeId: true } },
          addedBy:   { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!topic) throw new Error('Topic not found')

  const isOwner = topic.createdById === actorId
  const canEdit = isOwner || topic.collaborators.some((c) => c.person.id === actorId)

  let availableTrainers: { id: string; name: string; employeeId: string }[] = []
  if (isOwner) {
    const excludeIds = [topic.createdById, ...topic.collaborators.map((c) => c.person.id)]
    availableTrainers = await prisma.person.findMany({
      where: {
        isActive: true,
        id:       { notIn: excludeIds },
        roles:    { some: { role: { in: ['TRAINER', 'GUEST_TRAINER'] } } },
      },
      select:  { id: true, name: true, employeeId: true },
      orderBy: { name: 'asc' },
    })
  }

  return {
    owner:         topic.createdBy,
    isOwner,
    canEdit,
    collaborators: topic.collaborators,
    availableTrainers,
  }
}

export async function addTopicCollaborator(
  topicId:       string,
  personId:      string,
  actorId:       string,
  justification: string
) {
  const { topicName } = await assertTopicOwner(topicId, actorId)

  if (personId === actorId) throw new Error('You already have access as the topic owner')

  const person = await prisma.person.findUnique({
    where:  { id: personId },
    select: { id: true, name: true, isActive: true, roles: { select: { role: true } } },
  })
  if (!person || !person.isActive) throw new Error('Trainer not found')

  const roles = person.roles.map((r) => r.role)
  if (!roles.includes('TRAINER') && !roles.includes('GUEST_TRAINER')) {
    throw new Error('Only Trainers or Guest Trainers can be granted access')
  }

  const collaborator = await prisma.topicCollaborator.upsert({
    where:  { topicId_personId: { topicId, personId } },
    update: {},
    create: { topicId, personId, addedById: actorId },
    select: {
      id:        true,
      createdAt: true,
      person:    { select: { id: true, name: true, employeeId: true } },
      addedBy:   { select: { id: true, name: true } },
    },
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'UPDATE',
    module:        'TRAINING_TOPIC',
    recordId:      topicId,
    recordType:    'TopicCollaborator',
    beforeValue:   null,
    afterValue:    { grantedTo: person.name, topicName },
    justification,
  })

  return collaborator
}

export async function removeTopicCollaborator(
  topicId:       string,
  personId:      string,
  actorId:       string,
  justification: string
) {
  const { topicName } = await assertTopicOwner(topicId, actorId)

  const existing = await prisma.topicCollaborator.findUnique({
    where:  { topicId_personId: { topicId, personId } },
    select: { id: true, person: { select: { name: true } } },
  })
  if (!existing) return

  await prisma.topicCollaborator.delete({ where: { id: existing.id } })

  await logAuditEvent({
    userId:        actorId,
    action:        'REVOKE',
    module:        'TRAINING_TOPIC',
    recordId:      topicId,
    recordType:    'TopicCollaborator',
    beforeValue:   { revokedFrom: existing.person.name, topicName },
    afterValue:    null,
    justification,
  })
}
