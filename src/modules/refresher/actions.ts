'use server'

import { prisma }        from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import { createRefresherSchema } from './schema'
import type { CreateRefresherInput } from './types'

// ── Shared select ─────────────────────────────────────────────────

const REFRESHER_SELECT = {
  id:            true,
  triggerType:   true,
  status:        true,
  justification: true,
  dueDate:       true,
  completedAt:   true,
  createdAt:     true,
  person: {
    select: { id: true, name: true, employeeId: true },
  },
  topic: {
    select: { id: true, name: true },
  },
  raisedBy: {
    select: { id: true, name: true },
  },
} as const

// ── Helper — recompute overdue refreshers ─────────────────────────

async function refreshOverdueRefreshers() {
  await prisma.refresherTrigger.updateMany({
    where: {
      status:  'PENDING',
      dueDate: { lt: new Date() },
    },
    data: { status: 'OVERDUE' },
  })
}

// ── Get all refresher triggers ─────────────────────────────────────

export async function getRefreshers(filters?: {
  personId?:    string
  topicId?:     string
  status?:      string
  triggerType?: string
}) {
  await refreshOverdueRefreshers()

  const where: Record<string, unknown> = {}

  if (filters?.personId)    where.personId    = filters.personId
  if (filters?.topicId)     where.topicId     = filters.topicId
  if (filters?.status)      where.status      = filters.status
  if (filters?.triggerType) where.triggerType = filters.triggerType

  return prisma.refresherTrigger.findMany({
    where,
    select:  REFRESHER_SELECT,
    orderBy: { dueDate: 'asc' },
  })
}

// ── Get refreshers for current user ───────────────────────────────

export async function getMyRefreshers(personId: string) {
  await refreshOverdueRefreshers()

  return prisma.refresherTrigger.findMany({
    where:   { personId },
    select:  REFRESHER_SELECT,
    orderBy: { dueDate: 'asc' },
  })
}

// ── Create refresher trigger(s) — single or bulk ───────────────────
// This is the core function — implements URS-RFR-001 and URS-RFR-002

export async function createRefreshers(
  input:         CreateRefresherInput,
  justification: string,
  actorId:       string
) {
  const parsed = createRefresherSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.message)
  }

  // Justification is mandatory regardless of trigger type — but
  // DEVIATION and INCIDENT triggers especially require a clear reason
  // per URS-RFR-002 ("triggered manually by QA when incidences/deviations
  // are observed in review")
  if (justification.trim().length < 10) {
    throw new Error('A detailed justification is required for refresher triggers')
  }

  const topic = await prisma.trainingTopic.findUnique({
    where:  { id: input.topicId },
    select: { id: true, name: true, isActive: true },
  })
  if (!topic)          throw new Error('Topic not found')
  if (!topic.isActive) throw new Error('Topic is inactive')

  const persons = await prisma.person.findMany({
    where:  { id: { in: input.personIds }, isActive: true },
    select: { id: true, name: true },
  })
  if (persons.length === 0) throw new Error('No valid active persons found')

  // Prevent duplicate PENDING refreshers for the same person+topic
  const existing = await prisma.refresherTrigger.findMany({
    where: {
      personId: { in: persons.map((p) => p.id) },
      topicId:  input.topicId,
      status:   { in: ['PENDING', 'OVERDUE'] },
    },
    select: { personId: true },
  })
  const existingIds = new Set(existing.map((e) => e.personId))
  const newPersons   = persons.filter((p) => !existingIds.has(p.id))

  if (newPersons.length === 0) {
    throw new Error('All selected persons already have a pending refresher for this topic')
  }

  const dueDate = new Date(input.dueDate)

  // Create everything in a transaction — refresher + linked assignment
  const created = await prisma.$transaction(async (tx) => {
    const refreshers = []

    for (const person of newPersons) {
      // Create the assignment first (this is what the person actually sees/does)
      const assignment = await tx.trainingAssignment.create({
        data: {
          personId:     person.id,
          topicId:      input.topicId,
          trigger:      'REFRESHER',
          status:       'NOT_STARTED',
          assignedById: actorId,
          dueDate,
        },
      })

      // Create the refresher trigger record — links back to the assignment
      // via personId+topicId (no direct FK needed since assignment already
      // captures the work; refresher tracks the *reason* it was raised)
      const refresher = await tx.refresherTrigger.create({
        data: {
          personId:      person.id,
          topicId:       input.topicId,
          triggerType:   input.triggerType,
          status:        'PENDING',
          justification,
          raisedById:    actorId,
          dueDate,
        },
      })

      refreshers.push({ refresher, assignment })
    }

    return refreshers
  })

  // Notifications
  await prisma.notification.createMany({
    data: newPersons.map((p) => ({
      personId: p.id,
      type:     'ASSIGNMENT' as const,
      channel:  'IN_APP'      as const,
      title:    'Refresher training assigned',
      message:  `A ${input.triggerType.toLowerCase()} refresher for "${topic.name}" has been assigned. Due by ${dueDate.toLocaleDateString('en-IN')}.`,
    })),
  })

  // Audit log
  await logAuditEvent({
    userId:        actorId,
    action:        'ASSIGN',
    module:        'REFRESHER',
    recordId:      input.topicId,
    recordType:    'TrainingTopic',
    beforeValue:   null,
    afterValue:    {
      topicName:   topic.name,
      triggerType: input.triggerType,
      personIds:   newPersons.map((p) => p.id),
      personNames: newPersons.map((p) => p.name),
      dueDate:     input.dueDate,
    },
    justification,
  })

  return {
    created: created.length,
    skipped: existingIds.size,
    skippedNames: persons
      .filter((p) => existingIds.has(p.id))
      .map((p) => p.name),
  }
}

// ── Sync refresher status when linked assignment completes ─────────
// Called from assignments/actions.ts whenever an assignment with
// trigger = REFRESHER reaches COMPLETED status

export async function syncRefresherCompletion(
  personId: string,
  topicId:  string
) {
  const pending = await prisma.refresherTrigger.findFirst({
    where: {
      personId,
      topicId,
      status: { in: ['PENDING', 'OVERDUE'] },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!pending) return

  await prisma.refresherTrigger.update({
    where: { id: pending.id },
    data:  {
      status:      'COMPLETED',
      completedAt: new Date(),
    },
  })
}

// ── Get persons for refresher form dropdown ────────────────────────

export async function getPersonsForRefresher() {
  return prisma.person.findMany({
    where:  { isActive: true },
    select: {
      id:          true,
      name:        true,
      employeeId:  true,
      designation: true,
      department:  { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  })
}

// ── Get active topics for refresher form ───────────────────────────

export async function getActiveTopicsForRefresher() {
  return prisma.trainingTopic.findMany({
    where:   { isActive: true },
    select:  { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

// ── Refresher stats for dashboard ───────────────────────────────────

export async function getRefresherStats() {
  await refreshOverdueRefreshers()

  const [pending, overdue, completedThisMonth] = await Promise.all([
    prisma.refresherTrigger.count({ where: { status: 'PENDING' } }),
    prisma.refresherTrigger.count({ where: { status: 'OVERDUE' } }),
    prisma.refresherTrigger.count({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ])

  return { pending, overdue, completedThisMonth }
}