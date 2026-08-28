'use server'

import { prisma } from '@/lib/prisma'
import type {
  TrainingMatrixRow,
  TrainingIndexEntry,
  OverdueReportRow,
  QualificationStatusRow,
  TopicCompletionReport,
  TrainingAttendanceRecord,
  TrainerListItem,
} from './types'
import type { QualStatus } from '@prisma/client'
// At top of src/modules/reports/actions.ts
import { getSubordinateIds as _getSubordinateIds } from '@/lib/subordinates'

export async function getSubordinateIds(managerId: string): Promise<string[]> {
  return _getSubordinateIds(managerId)
}
// ─────────────────────────────────────────────────────────────────
// TRAINING MATRIX — URS-RPT-001
// ─────────────────────────────────────────────────────────────────

// The matrix is always scoped to a chosen time period ("when assigned") and
// org scope (department/unit/section, or the caller's team). Columns are
// derived from whichever topics were actually assigned to someone in that
// scope during that period — not every topic that exists — and each row's
// cells only count an assignment if it too falls inside the period, so the
// matrix always reflects "who was assigned what, in this window". Only
// SCHEDULE-triggered assignments are considered — induction and refresher
// trainings are tracked elsewhere and are deliberately excluded here.
export async function getTrainingMatrix(filters: {
  departmentId?:   string
  unitId?:         string
  sectionId?:      string
  subordinateIds?: string[]
  fromDate:        Date
  toDate:          Date
}): Promise<TrainingMatrixRow[]> {
  const persons = await prisma.person.findMany({
    where: {
      isActive: true,
      ...(filters.subordinateIds !== undefined
        ? { id: { in: filters.subordinateIds } }
        : {
            ...(filters.departmentId && { departmentId: filters.departmentId }),
            ...(filters.unitId       && { unitId:       filters.unitId       }),
            ...(filters.sectionId    && { sectionId:    filters.sectionId    }),
          }
      ),
    },
    select: {
      id:          true,
      name:        true,
      employeeId:  true,
      designation: true,
      department:  { select: { name: true } },
      section:     { select: { name: true } },
    },
    orderBy: [
      { department: { name: 'asc' } },
      { name:       'asc'          },
    ],
  })

  const personIds = persons.map((p) => p.id)
  if (personIds.length === 0) return []

  // Every assignment created within the period, for people in scope — this
  // is both the source of the dynamic column list and the per-cell data.
  const assignments = await prisma.trainingAssignment.findMany({
    where: {
      personId:  { in: personIds },
      trigger:   'SCHEDULE',
      createdAt: { gte: filters.fromDate, lte: filters.toDate },
    },
    select: {
      id:           true,
      personId:     true,
      topicId:      true,
      status:       true,
      createdAt:    true,
      dueDate:      true,
      completedAt:  true,
      topic:        { select: { id: true, name: true, sopReference: true } },
      assignedById: true,
      assignedBy:   { select: { name: true } },
      attempts: {
        orderBy: { submittedAt: 'desc' },
        take:    1,
        select:  { score: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Columns = distinct topics that were actually assigned to this scope
  // during the period — sorted by name, not by whatever exists globally.
  const topicsById = new Map<string, { name: string; sopReference: string | null }>()
  for (const a of assignments) topicsById.set(a.topicId, { name: a.topic.name, sopReference: a.topic.sopReference })
  const topics = Array.from(topicsById.entries())
    .map(([id, t]) => ({ id, name: t.name, sopReference: t.sopReference }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // Who assigned each topic to someone in this scope+period — if a person
  // has no assignment of their own for a topic because THEY'RE the one who
  // assigned it to everyone else, the cell should read "Trainer", not
  // "not assigned" (which would look like an oversight rather than the
  // reason).
  const trainerIdsByTopic = new Map<string, Set<string>>()
  for (const a of assignments) {
    const set = trainerIdsByTopic.get(a.topicId) ?? new Set<string>()
    set.add(a.assignedById)
    trainerIdsByTopic.set(a.topicId, set)
  }

  return persons.map((person) => ({
    person: {
      id:          person.id,
      name:        person.name,
      employeeId:  person.employeeId,
      designation: person.designation,
      department:  person.department,
      section:     person.section,
    },
    topics: topics.map((topic) => {
      // orderBy createdAt desc above, so the first match is the latest —
      // relevant only for the rare case of two assignments of the same
      // topic to the same person inside one period.
      const assignment = assignments.find((a) => a.personId === person.id && a.topicId === topic.id)

      if (!assignment) {
        return {
          topicId:      topic.id,
          topicName:    topic.name,
          sopReference: topic.sopReference,
          status:       'NOT_ASSIGNED' as const,
          isTrainer:    trainerIdsByTopic.get(topic.id)?.has(person.id) ?? false,
        }
      }

      return {
        topicId:      topic.id,
        topicName:    topic.name,
        sopReference: topic.sopReference,
        status:      assignment.status as TrainingMatrixRow['topics'][0]['status'],
        score:       assignment.attempts[0]?.score ?? undefined,
        assignedAt:  assignment.createdAt,
        completedAt: assignment.completedAt,
        dueDate:     assignment.dueDate,
        assignedBy:  assignment.assignedBy.name,
      }
    }),
  }))
}

// ─────────────────────────────────────────────────────────────────
// TRAINING INDEX per person — URS-RPT-002
// ─────────────────────────────────────────────────────────────────

export async function getTrainingIndex(
  personId: string
): Promise<TrainingIndexEntry[]> {
  const assignments = await prisma.trainingAssignment.findMany({
    where:   { personId },
    select:  {
      id:          true,
      trigger:     true,
      status:      true,
      dueDate:     true,
      startedAt:   true,
      completedAt: true,
      createdAt:   true,
      topic:       { select: { name: true, description: true } },
      assignedBy:  { select: { name: true } },
      attempts: {
        orderBy: { submittedAt: 'desc' },
        take:    1,
        select:  { score: true, outcome: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return assignments.map((a) => ({
    id:               a.id,
    topicName:        a.topic.name,
    topicDescription: a.topic.description,
    trigger:          a.trigger,
    status:           a.status,
    assignedAt:       a.createdAt,
    dueDate:          a.dueDate,
    startedAt:        a.startedAt,
    completedAt:      a.completedAt,
    score:            a.attempts[0]?.score   ?? null,
    outcome:          a.attempts[0]?.outcome ?? null,
    assignedBy:       a.assignedBy.name,
  }))
}

// ─────────────────────────────────────────────────────────────────
// OVERDUE REPORT — URS-RPT-003
// ─────────────────────────────────────────────────────────────────

export async function getOverdueReport(filters?: {
  departmentId?: string
  unitId?:       string
  sectionId?:    string
  subordinateIds?: string[]
}): Promise<OverdueReportRow[]> {
  const now = new Date()

  const assignments = await prisma.trainingAssignment.findMany({
    where: {
      status:  { in: ['OVERDUE', 'NOT_STARTED', 'IN_PROGRESS'] },
      dueDate: { lt: now },
      person:  {
        isActive: true,
        ...(filters?.subordinateIds !== undefined
          ? { id: { in: filters.subordinateIds } }
          : {
              ...(filters?.departmentId && { departmentId: filters.departmentId }),
              ...(filters?.unitId       && { unitId:       filters.unitId       }),
              ...(filters?.sectionId    && { sectionId:    filters.sectionId    }),
            }
        ),
      },
    },
    select: {
      id:        true,
      trigger:   true,
      createdAt: true,
      dueDate:   true,
      topic:     { select: { name: true } },
      person:  {
        select: {
          id:          true,
          name:        true,
          employeeId:  true,
          department:  { select: { name: true } },
          section:     { select: { name: true } },
          manager:     { select: { name: true } },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  })

  return assignments.map((a) => ({
    person: {
      id:         a.person.id,
      name:       a.person.name,
      employeeId: a.person.employeeId,
      department: a.person.department?.name ?? null,
      section:    a.person.section?.name    ?? null,
      manager:    a.person.manager?.name    ?? null,
    },
    assignment: {
      id:          a.id,
      topicName:   a.topic.name,
      trigger:     a.trigger,
      assignedAt:  a.createdAt,
      dueDate:     a.dueDate,
      daysOverdue: Math.floor(
        (now.getTime() - a.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      ),
    },
  }))
}


// ─────────────────────────────────────────────────────────────────
// HELPER — get subordinate IDs for a manager or trainer
// Returns empty array if person has no subordinates
// ─────────────────────────────────────────────────────────────────

// export async function getSubordinateIds(managerId: string): Promise<string[]> {
//   const subordinates = await prisma.person.findMany({
//     where:  { managerId, isActive: true },
//     select: { id: true },
//   })
//   return subordinates.map((s) => s.id)
// }

// ─────────────────────────────────────────────────────────────────
// QUALIFICATION STATUS BOARD — URS-RPT-004
// ─────────────────────────────────────────────────────────────────

export async function getQualificationStatusBoard(filters?: {
  departmentId?: string
  unitId?:       string
  sectionId?:    string
  status?:       string
  subordinateIds?: string[]
}): Promise<QualificationStatusRow[]> {
  const now = new Date()

  // ── Fix Bug 2: cast status to QualStatus enum ─────────────────
  const statusFilter = filters?.status as QualStatus | undefined

  const qualifications = await prisma.qualificationRecord.findMany({
    where: {
      ...(statusFilter && { status: statusFilter }),
      person: {
        isActive: true,
        ...(filters?.subordinateIds !== undefined
          ? { id: { in: filters.subordinateIds } }
          : {
              ...(filters?.departmentId && { departmentId: filters.departmentId }),
              ...(filters?.unitId       && { unitId:       filters.unitId       }),
              ...(filters?.sectionId    && { sectionId:    filters.sectionId    }),
            }
        ),
      },
    },
    select: {
      id:         true,
      status:     true,
      outcome:    true,
      approvedAt: true,
      expiryDate: true,
      // ── Fix Bug 3: select person object not personId ──────────
      person: {
        select: {
          id:         true,
          name:       true,
          employeeId: true,
          department: { select: { name: true } },
        },
      },
      technique:   { select: { name: true } },
      certificate: { select: { certNumber: true } },
    },
    orderBy: [
      { expiryDate: 'asc' },
      { person:     { name: 'asc' } },
    ],
  })

  return qualifications.map((q) => ({
    person: {
      id:         q.person.id,
      name:       q.person.name,
      employeeId: q.person.employeeId,
      department: q.person.department?.name ?? null,
    },
    technique:    q.technique.name,
    status:       q.status,
    outcome:      q.outcome,
    approvedAt:   q.approvedAt,
    expiryDate:   q.expiryDate,
    daysToExpiry: q.expiryDate
      ? Math.ceil((q.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null,
    certNumber:   q.certificate?.certNumber ?? null,
  }))
}

// ─────────────────────────────────────────────────────────────────
// DASHBOARD STATS — per role
// ─────────────────────────────────────────────────────────────────

export async function getTrainingHeadStats() {
  const now = new Date()

  const [
    totalPersons,
    totalTopics,
    totalMaterials,
    pendingApprovals,
    overdueAssignments,
    completedThisMonth,
    activeQualifications,
    expiringQuals,
    pendingRefreshers,
    failedAssessments,
  ] = await Promise.all([
    prisma.person.count({ where: { isActive: true } }),
    prisma.trainingTopic.count({ where: { isActive: true } }),
    prisma.trainingMaterial.count({ where: { status: 'APPROVED' } }),
    prisma.materialVersion.count({ where: { status: 'DRAFT' } }),
    prisma.trainingAssignment.count({
      where: {
        status:  { in: ['OVERDUE', 'NOT_STARTED', 'IN_PROGRESS'] },
        dueDate: { lt: now },
      },
    }),
    prisma.trainingAssignment.count({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
          lte: now,
        },
      },
    }),
    prisma.qualificationRecord.count({ where: { status: 'APPROVED' } }),
    prisma.qualificationRecord.count({
      where: {
        status:     'APPROVED',
        expiryDate: {
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          gte: now,
        },
      },
    }),
    prisma.refresherTrigger.count({
      where: { status: { in: ['PENDING', 'OVERDUE'] } },
    }),
    prisma.assessmentAttempt.count({ where: { outcome: 'NEEDS_RETRAINING' } }),
  ])

  return {
    totalPersons,
    totalTopics,
    totalMaterials,
    pendingApprovals,
    overdueAssignments,
    completedThisMonth,
    activeQualifications,
    expiringQuals,
    pendingRefreshers,
    failedAssessments,
  }
}

export async function getManagerStats(managerId: string) {
  const subordinates = await prisma.person.findMany({
    where:  { managerId, isActive: true },
    select: { id: true },
  })
  const ids = subordinates.map((s) => s.id)

  if (ids.length === 0) {
    return { total: 0, completed: 0, overdue: 0, pending: 0 }
  }

  const [total, completed, overdue, pending] = await Promise.all([
    prisma.trainingAssignment.count({ where: { personId: { in: ids }, status: { not: 'CANCELLED' } } }),
    prisma.trainingAssignment.count({ where: { personId: { in: ids }, status: 'COMPLETED'   } }),
    prisma.trainingAssignment.count({ where: { personId: { in: ids }, status: 'OVERDUE'     } }),
    prisma.trainingAssignment.count({
      where: { personId: { in: ids }, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] } },
    }),
  ])

  return { total, completed, overdue, pending }
}

export async function getMDStats() {
  const [
    totalPersons,
    totalDepartments,
    overdueAssignments,
    approvedQuals,
    activeTopics,
    completedThisYear,
  ] = await Promise.all([
    prisma.person.count({ where: { isActive: true } }),
    prisma.department.count({ where: { isActive: true } }),
    prisma.trainingAssignment.count({ where: { status: 'OVERDUE' } }),
    prisma.qualificationRecord.count({ where: { status: 'APPROVED' } }),
    prisma.trainingTopic.count({ where: { isActive: true } }),
    prisma.trainingAssignment.count({
      where: {
        status:      'COMPLETED',
        completedAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
      },
    }),
  ])

  return {
    totalPersons,
    totalDepartments,
    overdueAssignments,
    approvedQuals,
    activeTopics,
    completedThisYear,
  }
}

export async function getReviewerStats() {
  const [
    totalPersons,
    totalDepartments,
    overdueAssignments,
    approvedQuals,
    activeTopics,
    completedThisYear,
  ] = await Promise.all([
    prisma.person.count({ where: { isActive: true } }),
    prisma.department.count({ where: { isActive: true } }),
    prisma.trainingAssignment.count({ where: { status: 'OVERDUE' } }),
    prisma.qualificationRecord.count({ where: { status: 'APPROVED' } }),
    prisma.trainingTopic.count({ where: { isActive: true } }),
    prisma.trainingAssignment.count({
      where: {
        status:      'COMPLETED',
        completedAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
      },
    }),
  ])

  return {
    totalPersons,
    totalDepartments,
    overdueAssignments,
    approvedQuals,
    activeTopics,
    completedThisYear,
  }
}

// ─────────────────────────────────────────────────────────────────
// TOPIC COMPLETION REPORT — Topic, Trainer, sequential trainee list
// ─────────────────────────────────────────────────────────────────

export async function getTopicsForReport() {
  return prisma.trainingTopic.findMany({
    select:  { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

export async function getTopicCompletionReport(
  topicId: string,
  filters?: {
    subordinateIds?: string[]
    assignedById?:   string
    departmentId?:   string
    unitId?:         string
    sectionId?:      string
  }
): Promise<TopicCompletionReport | null> {
  const assignmentsWhere: Record<string, unknown> = {}
  if (filters?.subordinateIds !== undefined) {
    assignmentsWhere.personId = { in: filters.subordinateIds }
  }
  if (filters?.assignedById) {
    assignmentsWhere.assignedById = filters.assignedById
  }
  if (filters?.departmentId || filters?.unitId || filters?.sectionId) {
    assignmentsWhere.person = {
      ...(filters.departmentId && { departmentId: filters.departmentId }),
      ...(filters.unitId       && { unitId:       filters.unitId       }),
      ...(filters.sectionId    && { sectionId:    filters.sectionId    }),
    }
  }

  const topic = await prisma.trainingTopic.findUnique({
    where:  { id: topicId },
    select: {
      id:        true,
      name:      true,
      createdBy: { select: { name: true } },
      assignments: {
        select: {
          personId:    true,
          status:      true,
          createdAt:   true,
          dueDate:     true,
          completedAt: true,
          person:      { select: { id: true, name: true, employeeId: true } },
          assignedBy:  { select: { name: true } },
          questionBankVersion: { select: { versionNo: true, versionLabel: true } },
          materialVersions: {
            select: { materialVersion: { select: { versionNo: true, versionLabel: true } } },
          },
        },
        ...(Object.keys(assignmentsWhere).length > 0 ? { where: assignmentsWhere } : {}),
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!topic) return null

  return {
    topicId:     topic.id,
    topicName:   topic.name,
    trainerName: topic.createdBy.name,
    trainees: topic.assignments.map((a) => ({
      personId:    a.person.id,
      name:        a.person.name,
      employeeId:  a.person.employeeId,
      status:      a.status,
      assignedAt:  a.createdAt,
      dueDate:     a.dueDate,
      completedAt: a.completedAt,
      assignedBy:  a.assignedBy.name,
      questionBankVersionLabel: a.questionBankVersion
        ? `v${a.questionBankVersion.versionNo} (${a.questionBankVersion.versionLabel})`
        : null,
      materialVersionLabels: a.materialVersions.map(
        (mv) => `v${mv.materialVersion.versionNo} (${mv.materialVersion.versionLabel})`
      ),
    })),
  }
}

// ─────────────────────────────────────────────────────────────────
// TRAINING ATTENDANCE RECORD — everyone who completed one topic on one day
// ─────────────────────────────────────────────────────────────────

export async function getTrainingAttendanceRecord(filters: {
  topicId:         string
  date:            string  // 'YYYY-MM-DD' — a calendar date, not an instant
  subordinateIds?: string[]
}): Promise<TrainingAttendanceRecord> {
  const topic = await prisma.trainingTopic.findUnique({
    where:  { id: filters.topicId },
    select: { id: true, name: true, sopReference: true },
  })
  if (!topic) throw new Error('Topic not found')

  // Parsed as UTC (per the ES spec for bare "YYYY-MM-DD" strings) so the
  // day boundary is the same regardless of the server's local timezone —
  // appending a local offset via setHours() here would silently shift the
  // window on a server not running in UTC.
  const dayStart = new Date(`${filters.date}T00:00:00.000Z`)
  const dayEnd   = new Date(`${filters.date}T23:59:59.999Z`)

  const assignments = await prisma.trainingAssignment.findMany({
    where: {
      topicId:     filters.topicId,
      status:      'COMPLETED',
      completedAt: { gte: dayStart, lte: dayEnd },
      ...(filters.subordinateIds !== undefined && { personId: { in: filters.subordinateIds } }),
    },
    select: {
      completedAt: true,
      assignedBy:  { select: { name: true } },
      person: {
        select: {
          id: true, name: true, employeeId: true,
          department: { select: { name: true } },
        },
      },
    },
    // One row per person even if they somehow have more than one completed
    // assignment of the same topic on the same day (e.g. a retraining
    // cycle) — a sign-in sheet lists each attendee once.
    distinct: ['personId'],
    orderBy: { person: { name: 'asc' } },
  })

  // Most common assigner among the day's attendees — the "trainer" line
  // on the printed record. Falls back to null if there's no clear one.
  const trainerCounts = new Map<string, number>()
  for (const a of assignments) trainerCounts.set(a.assignedBy.name, (trainerCounts.get(a.assignedBy.name) ?? 0) + 1)
  const trainerName = Array.from(trainerCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return {
    topicId:      topic.id,
    topicName:    topic.name,
    sopReference: topic.sopReference,
    date:         filters.date,
    trainerName,
    attendees: assignments.map((a) => ({
      personId:    a.person.id,
      name:        a.person.name,
      employeeId:  a.person.employeeId,
      department:  a.person.department?.name ?? null,
      completedAt: a.completedAt!,
    })),
  }
}

// ─────────────────────────────────────────────────────────────────
// LIST OF TRAINERS — every active Trainer/Guest Trainer, org-wide
// ─────────────────────────────────────────────────────────────────

export async function getTrainersList(): Promise<TrainerListItem[]> {
  const trainers = await prisma.person.findMany({
    where: {
      isActive: true,
      roles:    { some: { role: { in: ['TRAINER', 'GUEST_TRAINER'] } } },
    },
    select: {
      id: true, name: true, employeeId: true, designation: true,
      roles:      { select: { role: true } },
      department: { select: { name: true } },
      unit:       { select: { name: true } },
      section:    { select: { name: true } },
    },
    orderBy: [
      { department: { name: 'asc' } },
      { name:       'asc'          },
    ],
  })

  return trainers.map((t) => ({
    id:          t.id,
    name:        t.name,
    employeeId:  t.employeeId,
    designation: t.designation,
    roles:       t.roles.map((r) => r.role),
    department:  t.department?.name ?? null,
    unit:        t.unit?.name       ?? null,
    section:     t.section?.name    ?? null,
  }))
}