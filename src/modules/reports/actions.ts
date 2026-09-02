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
  TrainingCalendarData,
  TrainingEvalObjectiveData,
  SopSelfReadoutData,
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
// TRAINING EVALUATION SHEET FOR OBJECTIVE QUESTIONS — form QbD/QA/F/007-05
// The chosen topic's active objective questions, taken from its question
// bank's current version. Options are returned, correct answers are not —
// the sheet is printed blank for a trainee to attempt.
// ─────────────────────────────────────────────────────────────────

export async function getTrainingEvalObjective(
  topicId: string
): Promise<TrainingEvalObjectiveData | null> {
  const topic = await prisma.trainingTopic.findUnique({
    where:  { id: topicId },
    select: {
      id:           true,
      name:         true,
      sopReference: true,
      questionBank: {
        select: {
          currentVersion: {
            select: {
              versionNo:    true,
              versionLabel: true,
              questions: {
                where:   { isActive: true },
                orderBy: { createdAt: 'asc' },
                select: {
                  questionText: true,
                  optionA:      true,
                  optionB:      true,
                  optionC:      true,
                  optionD:      true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!topic) return null

  const version = topic.questionBank?.currentVersion

  return {
    topicId:      topic.id,
    topicName:    topic.name,
    sopReference: topic.sopReference,
    versionLabel: version ? `v${version.versionNo} (${version.versionLabel})` : null,
    questions: (version?.questions ?? []).map((q) => ({
      questionText: q.questionText,
      optionA:      q.optionA,
      optionB:      q.optionB,
      optionC:      q.optionC,
      optionD:      q.optionD,
    })),
  }
}

// ─────────────────────────────────────────────────────────────────
// TRAINING ATTENDANCE RECORD — everyone a topic has been assigned to, with
// each person's assigned date and (once done) completion date
// ─────────────────────────────────────────────────────────────────

export async function getTrainingAttendanceRecord(filters: {
  topicId:         string
  date?:           string | null // 'YYYY-MM-DD' — a calendar date, not an instant; omit for all dates
  subordinateIds?: string[]
  // When set, only assignments this person made are counted — a Trainer's
  // attendance record shows the trainees they themselves assigned.
  assignedById?:   string
}): Promise<TrainingAttendanceRecord> {
  const topic = await prisma.trainingTopic.findUnique({
    where:  { id: filters.topicId },
    select: { id: true, name: true, sopReference: true },
  })
  if (!topic) throw new Error('Topic not found')

  // Parsed as UTC (per the ES spec for bare "YYYY-MM-DD" strings) so the
  // day boundary is the same regardless of the server's local timezone —
  // appending a local offset via setHours() here would silently shift the
  // window on a server not running in UTC. Only applied when a date is given.
  const dateWindow = filters.date
    ? {
        completedAt: {
          gte: new Date(`${filters.date}T00:00:00.000Z`),
          lte: new Date(`${filters.date}T23:59:59.999Z`),
        },
      }
    : {}

  const assignments = await prisma.trainingAssignment.findMany({
    where: {
      topicId:     filters.topicId,
      // Everyone the topic has been assigned to — not just those who have
      // completed it. Whether each person is done is shown by completedAt.
      ...dateWindow,
      ...(filters.subordinateIds !== undefined && { personId: { in: filters.subordinateIds } }),
      ...(filters.assignedById && { assignedById: filters.assignedById }),
    },
    select: {
      personId:    true,
      createdAt:   true,
      completedAt: true,
      assignedBy:  { select: { name: true } },
      person: {
        select: {
          id: true, name: true, employeeId: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // One row per person even if they have more than one assignment of the
  // same topic (e.g. a retraining cycle) — a sign-in sheet lists each
  // person once; the most recent assignment (first, given the orderBy) wins.
  const byPerson = new Map<string, (typeof assignments)[number]>()
  for (const a of assignments) if (!byPerson.has(a.personId)) byPerson.set(a.personId, a)
  const rows = Array.from(byPerson.values()).sort((a, b) => a.person.name.localeCompare(b.person.name))

  // Most common assigner among the listed people — the "trainer" line on the
  // printed record. Falls back to null if there's no clear one.
  const trainerCounts = new Map<string, number>()
  for (const a of rows) trainerCounts.set(a.assignedBy.name, (trainerCounts.get(a.assignedBy.name) ?? 0) + 1)
  const trainerName = Array.from(trainerCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return {
    topicId:      topic.id,
    topicName:    topic.name,
    sopReference: topic.sopReference,
    date:         filters.date ?? null,
    trainerName,
    attendees: rows.map((a) => ({
      personId:    a.person.id,
      name:        a.person.name,
      employeeId:  a.person.employeeId,
      department:  a.person.department?.name ?? null,
      assignedAt:  a.createdAt,
      completedAt: a.completedAt,
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

// ─────────────────────────────────────────────────────────────────
// LIST OF SOPs-SELF READOUT — form QbD/QA/F/007-12
// Every training assignment whose trigger reason is SOP_SELF_READOUT, one
// row each. The physical form's trainee-signature column is replaced by the
// trainee's name and the completion date (or "N/A" while still pending).
// ─────────────────────────────────────────────────────────────────

// The topic's SOP reference is a single free-text field, usually written as
// "QbD-QC-SOP-067, Ver.No. 04". Split it into an SOP number and a revision
// number for the two-column form layout; fall back to the whole string in
// the SOP-number column when it doesn't follow that shape.
function splitSopReference(ref: string | null): { sopNo: string; revisionNo: string } {
  if (!ref?.trim()) return { sopNo: '—', revisionNo: '—' }
  const [first, ...rest] = ref.split(',')
  const tail = rest.join(',').trim()
  if (!tail) return { sopNo: first.trim(), revisionNo: '—' }
  const revisionNo = tail.replace(/^ver\.?\s*no\.?\s*/i, '').replace(/^v\.?\s*/i, '').trim()
  return { sopNo: first.trim(), revisionNo: revisionNo || '—' }
}

export async function getSopSelfReadoutList(filters?: {
  subordinateIds?: string[]
}): Promise<SopSelfReadoutData> {
  const assignments = await prisma.trainingAssignment.findMany({
    where: {
      trigger: 'SOP_SELF_READOUT',
      ...(filters?.subordinateIds !== undefined
        ? { personId: { in: filters.subordinateIds } }
        : {}),
    },
    select: {
      id:          true,
      status:      true,
      completedAt: true,
      person: { select: { name: true, employeeId: true } },
      topic:  { select: { name: true, sopReference: true } },
    },
    orderBy: [
      { topic: { name: 'asc' } },
      { person: { name: 'asc' } },
    ],
  })

  return {
    rows: assignments.map((a) => {
      const { sopNo, revisionNo } = splitSopReference(a.topic.sopReference)
      const done = a.status === 'COMPLETED'
      return {
        assignmentId: a.id,
        sopNo,
        title:       a.topic.name,
        revisionNo,
        readOn:      done ? a.completedAt : null,
        empName:     a.person.name,
        employeeId:  a.person.employeeId,
        completedAt: done ? a.completedAt : null,
      }
    }),
  }
}

// ─────────────────────────────────────────────────────────────────
// TRAINING CALENDAR — organisation-wide yearly plan (form QbD/QA/F/007-03)
// ─────────────────────────────────────────────────────────────────

// The whole organisation's calendar for one year. Rows are added explicitly
// by a trainer — either picked from the Topics list (topicId set, title
// follows the topic) or typed in free-form (topicId null). Each row carries
// a 12-slot boolean array of which months are ticked for the requested year.
export async function getTrainingCalendar(filters: {
  year: number
}): Promise<TrainingCalendarData> {
  const rows = await prisma.trainingCalendarRow.findMany({
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    select: {
      id:      true,
      title:   true,
      topicId: true,
      topic:   { select: { name: true, isActive: true } },
      marks: {
        where:  { year: filters.year },
        select: { month: true },
      },
    },
  })

  // Keep topic-backed titles in step with a topic that was renamed.
  const stale = rows.filter((r) => r.topic && r.topic.name !== r.title)
  await Promise.all(
    stale.map((r) =>
      prisma.trainingCalendarRow.update({ where: { id: r.id }, data: { title: r.topic!.name } })
    )
  )

  // Hide rows whose linked topic has since been deactivated (the row and its
  // ticks stay in the table, so they return if the topic is reactivated).
  const visible = rows.filter((r) => !r.topicId || (r.topic?.isActive ?? false))
  const titleOf = (r: (typeof visible)[number]) => r.topic?.name ?? r.title

  // Topic-backed rows first (alphabetical), then free-form rows in add order.
  const topicRows  = visible.filter((r) => r.topicId).sort((a, b) => titleOf(a).localeCompare(titleOf(b)))
  const manualRows = visible.filter((r) => !r.topicId)
  const ordered    = [...topicRows, ...manualRows]

  return {
    year: filters.year,
    rows: ordered.map((r) => {
      const months = Array.from({ length: 12 }, () => false)
      for (const m of r.marks) {
        if (m.month >= 1 && m.month <= 12) months[m.month - 1] = true
      }
      return { id: r.id, title: titleOf(r), isTopic: r.topicId !== null, months }
    }),
  }
}

// Every Active/Pending topic (isActive === true — INACTIVE excluded), with a
// flag for whether it is already on the calendar. Powers the "Add topics"
// multi-select picker.
export async function getAddableTopics(): Promise<{
  id:           string
  name:         string
  sopReference: string | null
  alreadyAdded: boolean
}[]> {
  const [topics, existing] = await Promise.all([
    prisma.trainingTopic.findMany({
      where:   { isActive: true },
      select:  { id: true, name: true, sopReference: true },
      orderBy: { name: 'asc' },
    }),
    prisma.trainingCalendarRow.findMany({
      where:  { topicId: { not: null } },
      select: { topicId: true },
    }),
  ])
  const added = new Set(existing.map((e) => e.topicId))
  return topics.map((t) => ({ ...t, alreadyAdded: added.has(t.id) }))
}

// Bulk-add topic-backed rows. Silently skips ids that are inactive, unknown,
// or already on the calendar. Returns how many rows were actually created.
export async function addTrainingCalendarTopics(input: {
  topicIds: string[]
}): Promise<{ added: number }> {
  const ids = Array.from(new Set(input.topicIds ?? [])).filter(Boolean)
  if (ids.length === 0) return { added: 0 }

  const valid = await prisma.trainingTopic.findMany({
    where:  { id: { in: ids }, isActive: true },
    select: { id: true, name: true },
  })
  if (valid.length === 0) return { added: 0 }

  const res = await prisma.trainingCalendarRow.createMany({
    data: valid.map((t) => ({
      topicId: t.id,
      title:   t.name,
    })),
    skipDuplicates: true, // topicId is unique
  })
  return { added: res.count }
}

export async function renameTrainingCalendarRow(input: {
  rowId: string
  title: string
}): Promise<void> {
  const title = input.title.trim()
  if (!title) throw new Error('Training title is required')
  const row = await prisma.trainingCalendarRow.findUnique({
    where:  { id: input.rowId },
    select: { topicId: true },
  })
  if (!row) throw new Error('Row not found')
  if (row.topicId) throw new Error('This training comes from the Topics list — rename it there')
  await prisma.trainingCalendarRow.update({
    where: { id: input.rowId },
    data:  { title },
  })
}

// Removes any row — a picked topic or a free-form one — from the calendar,
// along with its ticks for every year. A topic removed here can be added
// back any time from the "Add topics" picker.
export async function deleteTrainingCalendarRow(rowId: string): Promise<void> {
  await prisma.trainingCalendarRow.delete({ where: { id: rowId } })
}

// Toggle one month cell on/off for a row in a year. Idempotent — setting a
// cell that is already in the requested state is a no-op.
export async function setTrainingCalendarMark(input: {
  rowId:   string
  year:    number
  month:   number  // 1–12
  checked: boolean
  actorId: string
}): Promise<void> {
  if (input.month < 1 || input.month > 12) throw new Error('Month must be 1–12')

  if (input.checked) {
    await prisma.trainingCalendarMark.upsert({
      where:  { rowId_year_month: { rowId: input.rowId, year: input.year, month: input.month } },
      create: {
        rowId:      input.rowId,
        year:       input.year,
        month:      input.month,
        markedById: input.actorId,
      },
      update: { markedById: input.actorId },
    })
  } else {
    await prisma.trainingCalendarMark.deleteMany({
      where: { rowId: input.rowId, year: input.year, month: input.month },
    })
  }
}