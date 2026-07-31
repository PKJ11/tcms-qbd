'use server'

import { prisma }        from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import { ForbiddenError } from './errors'

// ─────────────────────────────────────────────────────────────────
// QUESTION BANK ACCESS CONTROL
//
// Only the trainer who created a topic may edit its question bank
// (add/edit/archive/save questions) — unless they've explicitly granted
// another trainer access via QuestionBankCollaborator.
// ─────────────────────────────────────────────────────────────────

const NOT_OWNER_MESSAGE =
  'Only the trainer who created this topic can manage who has access to its question bank'

const NO_EDIT_ACCESS_MESSAGE =
  'Only the trainer who created this topic — or a trainer they have granted access to — can edit this question bank'

export async function assertQuestionBankEditAccess(bankId: string, actorId: string): Promise<void> {
  const bank = await prisma.questionBank.findUnique({
    where:  { id: bankId },
    select: {
      topic:         { select: { createdById: true } },
      collaborators: { where: { personId: actorId }, select: { id: true } },
    },
  })
  if (!bank) throw new Error('Question bank not found')

  const allowed = bank.topic.createdById === actorId || bank.collaborators.length > 0
  if (!allowed) throw new ForbiddenError(NO_EDIT_ACCESS_MESSAGE)
}

// Same check, but for endpoints that only have a staged working-set item id.
export async function assertWorkingSetItemEditAccess(itemId: string, actorId: string): Promise<void> {
  const item = await prisma.questionBankWorkingSetItem.findUnique({
    where:  { id: itemId },
    select: { workingSet: { select: { bankId: true } } },
  })
  if (!item) throw new Error('Staged question not found')
  await assertQuestionBankEditAccess(item.workingSet.bankId, actorId)
}

async function assertQuestionBankOwner(bankId: string, actorId: string): Promise<{ topicId: string; topicName: string }> {
  const bank = await prisma.questionBank.findUnique({
    where:  { id: bankId },
    select: { topic: { select: { id: true, name: true, createdById: true } } },
  })
  if (!bank) throw new Error('Question bank not found')
  if (bank.topic.createdById !== actorId) throw new ForbiddenError(NOT_OWNER_MESSAGE)
  return { topicId: bank.topic.id, topicName: bank.topic.name }
}

// ─────────────────────────────────────────────────────────────────
// COLLABORATOR MANAGEMENT — owner-only
// ─────────────────────────────────────────────────────────────────

export async function getQuestionBankAccess(bankId: string, actorId: string) {
  const bank = await prisma.questionBank.findUnique({
    where:  { id: bankId },
    select: {
      topic: {
        select: {
          createdById: true,
          createdBy:   { select: { id: true, name: true, employeeId: true } },
        },
      },
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
  if (!bank) throw new Error('Question bank not found')

  const isOwner = bank.topic.createdById === actorId
  const canEdit = isOwner || bank.collaborators.some((c) => c.person.id === actorId)

  let availableTrainers: { id: string; name: string; employeeId: string }[] = []
  if (isOwner) {
    const excludeIds = [bank.topic.createdById, ...bank.collaborators.map((c) => c.person.id)]
    const trainers = await prisma.person.findMany({
      where: {
        isActive: true,
        id:       { notIn: excludeIds },
        roles:    { some: { role: { in: ['TRAINER', 'GUEST_TRAINER'] } } },
      },
      select:  { id: true, name: true, employeeId: true },
      orderBy: { name: 'asc' },
    })
    availableTrainers = trainers
  }

  return {
    owner:         bank.topic.createdBy,
    isOwner,
    canEdit,
    collaborators: bank.collaborators,
    availableTrainers,
  }
}

export async function addQuestionBankCollaborator(bankId: string, personId: string, actorId: string) {
  const { topicName } = await assertQuestionBankOwner(bankId, actorId)

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

  const collaborator = await prisma.questionBankCollaborator.upsert({
    where:  { bankId_personId: { bankId, personId } },
    update: {},
    create: { bankId, personId, addedById: actorId },
    select: {
      id:        true,
      createdAt: true,
      person:    { select: { id: true, name: true, employeeId: true } },
      addedBy:   { select: { id: true, name: true } },
    },
  })

  await logAuditEvent({
    userId:      actorId,
    action:      'UPDATE',
    module:      'ASSESSMENT',
    recordId:    bankId,
    recordType:  'QuestionBankCollaborator',
    beforeValue: null,
    afterValue:  { grantedTo: person.name },
    justification: `Granted ${person.name} access to edit the "${topicName}" question bank`,
  })

  return collaborator
}

export async function removeQuestionBankCollaborator(bankId: string, personId: string, actorId: string) {
  const { topicName } = await assertQuestionBankOwner(bankId, actorId)

  const existing = await prisma.questionBankCollaborator.findUnique({
    where:  { bankId_personId: { bankId, personId } },
    select: { id: true, person: { select: { name: true } } },
  })
  if (!existing) return

  await prisma.questionBankCollaborator.delete({ where: { id: existing.id } })

  await logAuditEvent({
    userId:      actorId,
    action:      'REVOKE',
    module:      'ASSESSMENT',
    recordId:    bankId,
    recordType:  'QuestionBankCollaborator',
    beforeValue: { revokedFrom: existing.person.name },
    afterValue:  null,
    justification: `Revoked ${existing.person.name}'s access to edit the "${topicName}" question bank`,
  })
}
