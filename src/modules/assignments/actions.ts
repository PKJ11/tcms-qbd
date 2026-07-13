'use server'

import { prisma }        from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import {
  createAssignmentSchema,
  bulkAssignmentSchema,
} from './schema'
import type {
  CreateAssignmentInput,
  BulkAssignmentInput,
} from './types'
import { syncRefresherCompletion } from '@/modules/refresher'

// ── Shared select ─────────────────────────────────────────────────

const ASSIGNMENT_SELECT = {
  id:           true,
  trigger:      true,
  status:       true,
  dueDate:      true,
  startedAt:    true,
  viewedAt:     true,
  completedAt:  true,
  acknowledged: true,
  createdAt:    true,
  person: {
    select: { id: true, name: true, employeeId: true },
  },
  topic: {
    select: { id: true, name: true, trainingType: true },
  },
  assignedBy: {
    select: { id: true, name: true },
  },
} as const

// ── Helper — recompute overdue status ─────────────────────────────

async function refreshOverdueStatuses() {
  await prisma.trainingAssignment.updateMany({
    where: {
      status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
      dueDate: { lt: new Date() },
    },
    data: { status: 'OVERDUE' },
  })
}

// ── Get all assignments (admin view) ──────────────────────────────

export async function getAssignments(filters?: {
  personId?:     string
  topicId?:      string
  status?:       string
  trigger?:      string
  departmentId?: string
  sectionId?:    string
  managerId?:    string   // ← filters to this manager's direct reports
  assignedById?: string   // ← filters to trainings a specific trainer assigned
}) {
  await refreshOverdueStatuses()

  const where: Record<string, unknown> = {}

  if (filters?.personId)     where.personId     = filters.personId
  if (filters?.topicId)      where.topicId       = filters.topicId
  if (filters?.status)       where.status        = filters.status
  if (filters?.trigger)      where.trigger        = filters.trigger
  if (filters?.assignedById) where.assignedById   = filters.assignedById

  // Manager scope — subordinates only, regardless of department (per URS role matrix)
  if (filters?.managerId) {
    where.person = { managerId: filters.managerId }
  } else if (filters?.departmentId || filters?.sectionId) {
    where.person = {
      ...(filters?.departmentId && { departmentId: filters.departmentId }),
      ...(filters?.sectionId    && { sectionId:    filters.sectionId    }),
    }
  }

  return prisma.trainingAssignment.findMany({
    where,
    select:  ASSIGNMENT_SELECT,
    orderBy: { dueDate: 'asc' },
  })
}

// ── Get assignments for current user ──────────────────────────────

export async function getMyAssignments(personId: string) {
  await refreshOverdueStatuses()

  return prisma.trainingAssignment.findMany({
    where:  { personId },
    select: {
      ...ASSIGNMENT_SELECT,
      topic: {
        select: {
          id:           true,
          name:         true,
          description:  true,
          trainingType: true,
          materials: {
            where:  { status: 'APPROVED' },
            select: {
              id:             true,
              title:          true,
              currentVersion: true,
              versions: {
                where:   { status: 'APPROVED' },
                orderBy: { versionNo: 'desc' },
                take:    1,
                select: {
                  id:           true,
                  versionLabel: true,
                  versionType:  true,
                  fileType:     true,
                  status:       true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  })
}

// ── Get single assignment ─────────────────────────────────────────

export async function getAssignmentById(id: string) {
  return prisma.trainingAssignment.findUnique({
    where:  { id },
    select: {
      ...ASSIGNMENT_SELECT,
      topic: {
        select: {
          id:           true,
          name:         true,
          description:  true,
          trainingType: true,
          materials: {
            where:  { status: 'APPROVED' },
            select: {
              id:             true,
              title:          true,
              currentVersion: true,
              versions: {
                where:   { status: 'APPROVED' },
                orderBy: { versionNo: 'desc' },
                take:    1,
                select: {
                  id:           true,
                  versionLabel: true,
                  versionType:  true,
                  fileType:     true,
                  fileUrl:      true,
                  status:       true,
                },
              },
            },
          },
        },
      },
      materialConfirmations: {
        select: { materialId: true, confirmedAt: true },
      },
    },
  })
}

// ── Create assignment(s) — individual or bulk ──────────────────────

export async function createAssignments(
  input:         CreateAssignmentInput,
  justification: string,
  actorId:       string
) {
  const parsed = createAssignmentSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.message)
  }

  // Verify topic exists and is active
  const topic = await prisma.trainingTopic.findUnique({
    where:  { id: input.topicId },
    select: { id: true, name: true, isActive: true },
  })
  if (!topic)            throw new Error('Topic not found')
  if (!topic.isActive)   throw new Error('Topic is inactive')

  // Verify persons exist
  const persons = await prisma.person.findMany({
    where:  { id: { in: input.personIds }, isActive: true },
    select: { id: true, name: true },
  })
  if (persons.length === 0) {
    throw new Error('No valid active persons found')
  }

  // Check for existing incomplete assignments for same topic made by THIS
  // trainer — other trainers may independently assign the same topic
  const existing = await prisma.trainingAssignment.findMany({
    where: {
      personId:     { in: persons.map((p) => p.id) },
      topicId:      input.topicId,
      assignedById: actorId,
      status:       { in: ['NOT_STARTED', 'IN_PROGRESS', 'OVERDUE'] },
    },
    select: { personId: true },
  })
  const existingPersonIds = new Set(existing.map((e) => e.personId))
  const newPersons = persons.filter((p) => !existingPersonIds.has(p.id))

  // Notify the assigning trainer if any selected persons were skipped because
  // this topic is already due for them — fires even when everyone was skipped
  if (existingPersonIds.size > 0) {
    const skippedNames = persons
      .filter((p) => existingPersonIds.has(p.id))
      .map((p) => p.name)

    await prisma.notification.create({
      data: {
        personId: actorId,
        type:     'ASSIGNMENT',
        channel:  'IN_APP',
        title:    `"${topic.name}" already due for some people`,
        message:  `${skippedNames.length} of the selected people already have an active assignment for "${topic.name}" and were skipped: ${skippedNames.join(', ')}.`,
      },
    })
  }

  if (newPersons.length === 0) {
    throw new Error('All selected persons already have an active assignment for this topic')
  }

  // Create assignments
  const created = await prisma.trainingAssignment.createMany({
    data: newPersons.map((p) => ({
      personId:           p.id,
      topicId:            input.topicId,
      trigger:            input.trigger,
      status:             'NOT_STARTED' as const,
      assignedById:       actorId,
      dueDate:            new Date(input.dueDate),
      needIdentifiedById: input.needIdentifiedById?.trim() || null,
      needBasis:          input.needBasis?.trim() || null,
    })),
  })

  // Create notifications
  await prisma.notification.createMany({
    data: newPersons.map((p) => ({
      personId: p.id,
      type:     'ASSIGNMENT' as const,
      channel:  'IN_APP'      as const,
      title:    'New training assigned',
      message:  `You have been assigned "${topic.name}" training. Due by ${new Date(input.dueDate).toLocaleDateString('en-IN')}.`,
    })),
  })

  // Audit log
  await logAuditEvent({
    userId:        actorId,
    action:        'ASSIGN',
    module:        'TRAINING_ASSIGNMENT',
    recordId:      input.topicId,
    recordType:    'TrainingTopic',
    beforeValue:   null,
    afterValue:    {
      topicName:  topic.name,
      personIds:  newPersons.map((p) => p.id),
      personNames: newPersons.map((p) => p.name),
      trigger:    input.trigger,
      dueDate:    input.dueDate,
    },
    justification,
  })

  return {
    created: created.count,
    skipped: existingPersonIds.size,
    skippedNames: persons
      .filter((p) => existingPersonIds.has(p.id))
      .map((p) => p.name),
  }
}

// ── Bulk assign by department(s) / section(s) ───────────────────────

export async function bulkAssignByDepartment(
  input:         BulkAssignmentInput,
  justification: string,
  actorId:       string
) {
  const parsed = bulkAssignmentSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.message)
  }

  // Build one OR-clause per department, each optionally scoped to its own sections.
  // Keeping department+sections paired avoids one department's section filter
  // incorrectly excluding people in a different selected department.
  const orConditions = input.selections.map((sel) => ({
    departmentId: sel.departmentId,
    ...(sel.sectionIds && sel.sectionIds.length > 0
      ? { sectionId: { in: sel.sectionIds } }
      : {}),
  }))

  const persons = await prisma.person.findMany({
    where: {
      isActive: true,
      OR: orConditions,
    },
    select: { id: true, name: true },
  })

  if (persons.length === 0) {
    throw new Error('No active persons found in the selected department(s)/section(s)')
  }

  return createAssignments(
    {
      personIds:           persons.map((p) => p.id),
      topicId:              input.topicId,
      trigger:              input.trigger,
      dueDate:              input.dueDate,
      needIdentifiedById:   input.needIdentifiedById ?? undefined,
      needBasis:            input.needBasis ?? undefined,
    },
    justification,
    actorId
  )
}

// ── Auto-assign induction training on person creation ─────────────
// Called from personnel/actions.ts when a new person is created

export async function autoAssignInductionTraining(
  personId:     string,
  departmentId: string,
  unitId:       string,
  actorId:      string,
  sectionId?:   string
) {
  // Find all topics whose compulsory scope covers this person — a scope row
  // matches when its department matches and (its unit is unset or matches)
  // and (its section is unset or matches). Department-only scope rows apply
  // to everyone in the department; unit/section rows narrow it further.
  const sectionCond = sectionId
    ? { OR: [{ sectionId: null }, { sectionId }] }
    : { sectionId: null }

  const topics = await prisma.trainingTopic.findMany({
    where: {
      isActive: true,
      topicScopes: {
        some: {
          departmentId,
          AND: [
            { OR: [{ unitId: null }, { unitId }] },
            sectionCond,
          ],
        },
      },
    },
    select: { id: true, name: true },
  })

  if (topics.length === 0) return

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 14) // 14 days for induction

  await prisma.trainingAssignment.createMany({
    data: topics.map((t) => ({
      personId,
      topicId:      t.id,
      trigger:      'INDUCTION' as const,
      status:       'NOT_STARTED' as const,
      assignedById: actorId,
      dueDate,
    })),
  })

  await prisma.notification.createMany({
    data: topics.map((t) => ({
      personId,
      type:    'ASSIGNMENT' as const,
      channel: 'IN_APP'      as const,
      title:   'Induction training assigned',
      message: `"${t.name}" has been assigned as part of your induction.`,
    })),
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'ASSIGN',
    module:        'TRAINING_ASSIGNMENT',
    recordId:      personId,
    recordType:    'Person',
    beforeValue:   null,
    afterValue:    {
      topics:  topics.map((t) => t.name),
      trigger: 'INDUCTION',
    },
    justification: 'Auto-assigned induction training based on department on person creation',
  })
}

// ── Start assignment (user begins viewing material) ────────────────

export async function startAssignment(
  assignmentId: string,
  actorId:      string
) {
  const assignment = await prisma.trainingAssignment.findUnique({
    where:  { id: assignmentId },
    select: { id: true, personId: true, status: true },
  })

  if (!assignment)                  throw new Error('Assignment not found')
  if (assignment.personId !== actorId) throw new Error('Not authorised')
  if (assignment.status !== 'NOT_STARTED') return assignment // already started

  await prisma.trainingAssignment.update({
    where: { id: assignmentId },
    data:  {
      status:    'IN_PROGRESS',
      startedAt: new Date(),
    },
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'UPDATE',
    module:        'TRAINING_ASSIGNMENT',
    recordId:      assignmentId,
    recordType:    'TrainingAssignment',
    beforeValue:   { status: 'NOT_STARTED' },
    afterValue:    { status: 'IN_PROGRESS' },
    justification: 'User started viewing assigned training material',
  })
}

// ── Acknowledge (read & understood) — completes Acknowledgement-Only topics ──

export async function acknowledgeAssignment(
  assignmentId: string,
  actorId:      string
) {
  const assignment = await prisma.trainingAssignment.findUnique({
    where:  { id: assignmentId },
    select: {
      id: true, personId: true, status: true, topicId: true, trigger: true,
      topic: { select: { trainingType: true } },
    },
  })

  if (!assignment)                     throw new Error('Assignment not found')
  if (assignment.personId !== actorId) throw new Error('Not authorised')

  // Only Acknowledgement-Only topics complete on the ack button itself —
  // Material-Only completes on view, Material+MCQ completes on passing the assessment.
  const willComplete = assignment.topic.trainingType === 'ACKNOWLEDGEMENT_ONLY'

  await prisma.trainingAssignment.update({
    where: { id: assignmentId },
    data:  {
      acknowledged: true,
      ...(willComplete && {
        status:      'COMPLETED',
        completedAt: new Date(),
      }),
    },
  })

  // Sync linked refresher trigger if this was a refresher assignment
  if (willComplete && assignment.trigger === 'REFRESHER') {
    await syncRefresherCompletion(assignment.personId, assignment.topicId)
  }

  await logAuditEvent({
    userId:        actorId,
    action:        'UPDATE',
    module:        'TRAINING_ASSIGNMENT',
    recordId:      assignmentId,
    recordType:    'TrainingAssignment',
    beforeValue:   { acknowledged: false },
    afterValue:    {
      acknowledged: true,
      completed:    willComplete,
    },
    justification: 'User acknowledged reading and understanding the training material',
  })

  return { completed: willComplete }
}

// ── Mark material viewed — completes Material-Only topics ──────────

export async function markAssignmentViewed(
  assignmentId: string,
  actorId:      string
) {
  const assignment = await prisma.trainingAssignment.findUnique({
    where:  { id: assignmentId },
    select: {
      id: true, personId: true, status: true, viewedAt: true,
    },
  })

  if (!assignment)                     throw new Error('Assignment not found')
  if (assignment.personId !== actorId) throw new Error('Not authorised')

  await prisma.trainingAssignment.update({
    where: { id: assignmentId },
    data: {
      ...(assignment.viewedAt ? {} : { viewedAt: new Date() }),
      ...(assignment.status === 'NOT_STARTED' && {
        status:    'IN_PROGRESS',
        startedAt: new Date(),
      }),
    },
  })

  if (!assignment.viewedAt) {
    await logAuditEvent({
      userId:        actorId,
      action:        'UPDATE',
      module:        'TRAINING_ASSIGNMENT',
      recordId:      assignmentId,
      recordType:    'TrainingAssignment',
      beforeValue:   { viewedAt: null },
      afterValue:    { viewedAt: new Date().toISOString() },
      justification: 'User opened the training material',
    })
  }

  return { completed: false }
}

// ── Confirm a single material — completes Material-Only topics once ──
// every approved material for the topic has been confirmed ────────────

export async function confirmAssignmentMaterial(
  assignmentId: string,
  materialId:   string,
  actorId:      string
) {
  const assignment = await prisma.trainingAssignment.findUnique({
    where:  { id: assignmentId },
    select: {
      id: true, personId: true, status: true, topicId: true, trigger: true,
      topic: {
        select: {
          trainingType: true,
          materials: {
            where:  { status: 'APPROVED' },
            select: { id: true },
          },
        },
      },
    },
  })

  if (!assignment)                     throw new Error('Assignment not found')
  if (assignment.personId !== actorId) throw new Error('Not authorised')

  await prisma.assignmentMaterialConfirmation.upsert({
    where:  { assignmentId_materialId: { assignmentId, materialId } },
    create: { assignmentId, materialId },
    update: {},
  })

  if (assignment.status === 'NOT_STARTED') {
    await prisma.trainingAssignment.update({
      where: { id: assignmentId },
      data:  { status: 'IN_PROGRESS', startedAt: new Date() },
    })
  }

  let allConfirmed = false
  let completed     = false

  if (assignment.topic.trainingType === 'MATERIAL_ONLY') {
    const confirmedCount = await prisma.assignmentMaterialConfirmation.count({
      where: { assignmentId },
    })
    allConfirmed = confirmedCount >= assignment.topic.materials.length

    if (allConfirmed && assignment.status !== 'COMPLETED') {
      completed = true
      await prisma.trainingAssignment.update({
        where: { id: assignmentId },
        data:  { status: 'COMPLETED', completedAt: new Date() },
      })

      if (assignment.trigger === 'REFRESHER') {
        await syncRefresherCompletion(assignment.personId, assignment.topicId)
      }

      await logAuditEvent({
        userId:        actorId,
        action:        'UPDATE',
        module:        'TRAINING_ASSIGNMENT',
        recordId:      assignmentId,
        recordType:    'TrainingAssignment',
        beforeValue:   { status: assignment.status },
        afterValue:    { status: 'COMPLETED' },
        justification: 'User confirmed all training material as reviewed',
      })
    }
  } else {
    const confirmedCount = await prisma.assignmentMaterialConfirmation.count({
      where: { assignmentId },
    })
    allConfirmed = confirmedCount >= assignment.topic.materials.length
  }

  return { completed, allConfirmed }
}

// ── Get persons for assignment dropdown ────────────────────────────

export async function getPersonsForAssignment(filters?: {
  departmentId?: string
  sectionId?:    string
}) {
  return prisma.person.findMany({
    where: {
      isActive:     true,
      ...(filters?.departmentId && { departmentId: filters.departmentId }),
      ...(filters?.sectionId    && { sectionId:    filters.sectionId    }),
    },
    select: {
      id:          true,
      name:        true,
      employeeId:  true,
      designation: true,
      department:  { select: { id: true, name: true } },
      section:     { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  })
}

// ── Get departments (with sections) for bulk assignment ────────────

export async function getDepartmentsForAssignment() {
  return prisma.department.findMany({
    where:  { isActive: true },
    select: {
      id:   true,
      name: true,
      code: true,
      units: {
        where:  { isActive: true },
        select: {
          id:   true,
          name: true,
          sections: {
            where:   { isActive: true },
            select:  { id: true, name: true, code: true },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      },
      _count: { select: { persons: true } },
    },
    orderBy: { name: 'asc' },
  })
}

// ── Get active topics for assignment ───────────────────────────────

export async function getActiveTopicsForAssignment() {
  return prisma.trainingTopic.findMany({
    where:   { isActive: true },
    select:  { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

// ── Check if a person has any direct reports ──────────────────────

export async function personHasSubordinates(personId: string): Promise<boolean> {
  const count = await prisma.person.count({
    where: { managerId: personId, isActive: true },
  })
  return count > 0
}