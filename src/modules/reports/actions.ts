'use server'

import { prisma } from '@/lib/prisma'
import type {
  TrainingMatrixRow,
  TrainingIndexEntry,
  OverdueReportRow,
  QualificationStatusRow,
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

export async function getTrainingMatrix(filters?: {
  departmentId?: string
  sectionId?:    string
  topicId?:      string
  subordinateIds?: string[]
}): Promise<TrainingMatrixRow[]> {
  const persons = await prisma.person.findMany({
    where: {
      isActive: true,
      ...(filters?.subordinateIds && filters.subordinateIds.length > 0
        ? { id: { in: filters.subordinateIds } }
        : {
            ...(filters?.departmentId && { departmentId: filters.departmentId }),
            ...(filters?.sectionId    && { sectionId:    filters.sectionId    }),
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
      trainingAssignments: {
        select: {
          id:          true,
          topicId:     true,
          status:      true,
          dueDate:     true,
          completedAt: true,
          startedAt:   true,
          topic:       { select: { id: true, name: true } },
          attempts: {
            orderBy: { submittedAt: 'desc' },
            take:    1,
            select:  { score: true, outcome: true },
          },
        },
        ...(filters?.topicId && { where: { topicId: filters.topicId } }),
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: [
      { department: { name: 'asc' } },
      { name:       'asc'          },
    ],
  })

  // Training topics are intentionally NOT filtered by department/section —
  // a TrainingTopic is only linked to departments via TopicDepartment
  // (used for induction auto-assign), it isn't owned by one.
  const topicsWhere = filters?.topicId
    ? { id: filters.topicId, isActive: true }
    : { isActive: true }

  const topics = await prisma.trainingTopic.findMany({
    where:   topicsWhere,
    select:  { id: true, name: true },
    orderBy: { name: 'asc' },
  })

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
      const assignment = person.trainingAssignments
        .filter((a) => a.topicId === topic.id)
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())[0]

      if (!assignment) {
        return {
          topicId:   topic.id,
          topicName: topic.name,
          status:    'NOT_ASSIGNED' as const,
        }
      }

      const latestAttempt = assignment.attempts[0]

      return {
        topicId:     topic.id,
        topicName:   topic.name,
        status:      assignment.status as TrainingMatrixRow['topics'][0]['status'],
        score:       latestAttempt?.score    ?? undefined,
        completedAt: assignment.completedAt,
        dueDate:     assignment.dueDate,
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
      topic:       { select: { name: true } },
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
    id:          a.id,
    topicName:   a.topic.name,
    trigger:     a.trigger,
    status:      a.status,
    assignedAt:  a.createdAt,
    dueDate:     a.dueDate,
    startedAt:   a.startedAt,
    completedAt: a.completedAt,
    score:       a.attempts[0]?.score   ?? null,
    outcome:     a.attempts[0]?.outcome ?? null,
    assignedBy:  a.assignedBy.name,
  }))
}

// ─────────────────────────────────────────────────────────────────
// OVERDUE REPORT — URS-RPT-003
// ─────────────────────────────────────────────────────────────────

export async function getOverdueReport(filters?: {
  departmentId?: string
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
        ...(filters?.subordinateIds && filters.subordinateIds.length > 0
          ? { id: { in: filters.subordinateIds } }
          : {
              ...(filters?.departmentId && { departmentId: filters.departmentId }),
              ...(filters?.sectionId    && { sectionId:    filters.sectionId    }),
            }
        ),
      },
    },
    select: {
      id:      true,
      trigger: true,
      dueDate: true,
      topic:   { select: { name: true } },
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
        ...(filters?.subordinateIds && filters.subordinateIds.length > 0
          ? { id: { in: filters.subordinateIds } }
          : {
              ...(filters?.departmentId && { departmentId: filters.departmentId }),
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
    prisma.trainingAssignment.count({ where: { personId: { in: ids } } }),
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