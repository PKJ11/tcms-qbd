'use server'

import { prisma }        from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import { createTopicGroupSchema, updateTopicGroupTopicsSchema } from './schema'
import type { CreateTopicGroupInput, UpdateTopicGroupTopicsInput } from './types'
import type { TeamMemberNode } from './types'

// ── Shared select ─────────────────────────────────────────────────

const GROUP_SELECT = {
  id:        true,
  name:      true,
  isActive:  true,
  createdAt: true,
  department: {
    select: { id: true, name: true, code: true },
  },
  unit: {
    select: { id: true, name: true },
  },
  section: {
    select: { id: true, name: true },
  },
  createdBy: {
    select: { id: true, name: true },
  },
  items: {
    orderBy: { position: 'asc' as const },
    select: {
      id:       true,
      position: true,
      topic:    { select: { id: true, name: true } },
    },
  },
} as const

// A trainer's "team" is their own department+unit — every Topic Group
// action is scoped to this, never to a client-supplied department/unit.
async function getActorScope(actorId: string) {
  const actor = await prisma.person.findUnique({
    where:  { id: actorId },
    select: {
      departmentId: true,
      unitId:       true,
      department:   { select: { id: true, name: true, code: true } },
      unit:         { select: { id: true, name: true } },
    },
  })
  if (!actor) throw new Error('Actor not found')
  return actor
}

// ── List topic groups for the trainer's own unit ("their team") ────

export async function getTopicGroups(actorId: string, filters?: { isActive?: boolean }) {
  const scope = await getActorScope(actorId)

  return prisma.topicGroup.findMany({
    where: {
      departmentId: scope.departmentId,
      unitId:       scope.unitId,
      isActive:     filters?.isActive ?? true,
    },
    select:  GROUP_SELECT,
    orderBy: [{ section: { name: 'asc' } }, { name: 'asc' }],
  })
}

// ── Dropdown data ────────────────────────────────────────────────────

export async function getActiveTopicsForGrouping() {
  return prisma.trainingTopic.findMany({
    where:   { isActive: true },
    select:  { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

// The trainer's own department/unit (fixed, non-editable scope) + that
// unit's sections, for the optional "narrow to one section" picker.
export async function getMyGroupingScope(actorId: string) {
  const scope = await getActorScope(actorId)

  const sections = await prisma.section.findMany({
    where:   { unitId: scope.unitId, isActive: true },
    select:  { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  })

  return {
    department: scope.department,
    unit:       scope.unit,
    sections,
  }
}

// ── Create a topic group ────────────────────────────────────────────

export async function createTopicGroup(
  input:         CreateTopicGroupInput,
  justification: string,
  actorId:       string
) {
  const parsed = createTopicGroupSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input')
  }

  if (justification.trim().length < 10) {
    throw new Error('A detailed justification is required to create a topic group')
  }

  const scope = await getActorScope(actorId)

  let sectionId: string | null = null
  if (parsed.data.sectionId) {
    const section = await prisma.section.findFirst({
      where:  { id: parsed.data.sectionId, unitId: scope.unitId, isActive: true },
      select: { id: true },
    })
    if (!section) throw new Error('That section does not belong to your unit')
    sectionId = section.id
  }

  const topics = await prisma.trainingTopic.findMany({
    where:  { id: { in: parsed.data.topicIds }, isActive: true },
    select: { id: true, name: true },
  })
  if (topics.length === 0) throw new Error('No valid active topics found')

  const group = await prisma.topicGroup.create({
    data: {
      name:         parsed.data.name,
      departmentId: scope.departmentId,
      unitId:       scope.unitId,
      sectionId,
      createdById:  actorId,
      items: {
        create: topics.map((t, i) => ({ topicId: t.id, position: i })),
      },
    },
    select: GROUP_SELECT,
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'CREATE',
    module:        'TRAINING_TOPIC',
    recordId:      group.id,
    recordType:    'TopicGroup',
    beforeValue:   null,
    afterValue:    {
      name:    group.name,
      unit:    `${scope.department.name} / ${scope.unit.name}`,
      section: group.section?.name ?? null,
      topics:  topics.map((t) => t.name),
    },
    justification,
  })

  return group
}

// ── Authorisation helper — a trainer may only manage groups for their
// own department+unit, regardless of who created them ──────────────

async function assertOwnsGroup(groupId: string, actorId: string) {
  const scope = await getActorScope(actorId)

  const group = await prisma.topicGroup.findUnique({
    where:  { id: groupId },
    select: { id: true, name: true, departmentId: true, unitId: true, items: { select: { topic: { select: { name: true } } } } },
  })
  if (!group) throw new Error('Topic group not found')
  if (group.departmentId !== scope.departmentId || group.unitId !== scope.unitId) {
    throw new Error('You can only manage topic groups for your own team')
  }

  return group
}

// ── Replace a group's topic list (drag-and-drop save) ───────────────

export async function updateTopicGroupTopics(
  groupId:       string,
  input:         UpdateTopicGroupTopicsInput,
  justification: string,
  actorId:       string
) {
  const parsed = updateTopicGroupTopicsSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input')
  }

  if (justification.trim().length < 10) {
    throw new Error('A detailed justification is required to update a topic group')
  }

  const existing = await assertOwnsGroup(groupId, actorId)

  const topics = parsed.data.topicIds.length > 0
    ? await prisma.trainingTopic.findMany({
        where:  { id: { in: parsed.data.topicIds }, isActive: true },
        select: { id: true, name: true },
      })
    : []

  await prisma.$transaction([
    prisma.topicGroupItem.deleteMany({ where: { groupId } }),
    prisma.topicGroupItem.createMany({
      data: topics.map((t, i) => ({ groupId, topicId: t.id, position: i })),
    }),
  ])

  const updated = await prisma.topicGroup.findUniqueOrThrow({
    where:  { id: groupId },
    select: GROUP_SELECT,
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'UPDATE',
    module:        'TRAINING_TOPIC',
    recordId:      groupId,
    recordType:    'TopicGroup',
    beforeValue:   { topics: existing.items.map((i) => i.topic.name) },
    afterValue:    { topics: topics.map((t) => t.name) },
    justification,
  })

  return updated
}

// ── Rename a topic group ────────────────────────────────────────────

export async function renameTopicGroup(
  groupId:       string,
  name:          string,
  justification: string,
  actorId:       string
) {
  const trimmed = name.trim()
  if (trimmed.length < 3) throw new Error('Group name must be at least 3 characters')

  if (justification.trim().length < 10) {
    throw new Error('A detailed justification is required to rename a topic group')
  }

  const existing = await assertOwnsGroup(groupId, actorId)

  const updated = await prisma.topicGroup.update({
    where:  { id: groupId },
    data:   { name: trimmed },
    select: GROUP_SELECT,
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'UPDATE',
    module:        'TRAINING_TOPIC',
    recordId:      groupId,
    recordType:    'TopicGroup',
    beforeValue:   { name: existing.name },
    afterValue:    { name: trimmed },
    justification,
  })

  return updated
}

// ── Deactivate a topic group ─────────────────────────────────────────
// Soft-delete — new joinees stop receiving its topics, but the group and
// every assignment it already created remain on record.

export async function deactivateTopicGroup(
  groupId:       string,
  justification: string,
  actorId:       string
) {
  if (justification.trim().length < 10) {
    throw new Error('A detailed justification is required to deactivate a topic group')
  }

  const existing = await assertOwnsGroup(groupId, actorId)

  const updated = await prisma.topicGroup.update({
    where:  { id: groupId },
    data:   { isActive: false },
    select: GROUP_SELECT,
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'DEACTIVATE',
    module:        'TRAINING_TOPIC',
    recordId:      groupId,
    recordType:    'TopicGroup',
    beforeValue:   { name: existing.name, isActive: true },
    afterValue:    { isActive: false },
    justification,
  })

  return updated
}

// ── Team overview — trainer's full reporting chain, grouped by dept ──

const TEAM_PERSON_SELECT = {
  id:          true,
  name:        true,
  employeeId:  true,
  designation: true,
  joiningDate: true,
  department:  { select: { id: true, name: true, code: true } },
  unit:        { select: { id: true, name: true } },
  roles:       { select: { role: true } },
} as const

async function buildTeamTree(personId: string): Promise<TeamMemberNode | null> {
  const person = await prisma.person.findUnique({
    where:  { id: personId },
    select: TEAM_PERSON_SELECT,
  })
  if (!person) return null

  const directReports = await prisma.person.findMany({
    where:   { managerId: personId, isActive: true },
    select:  TEAM_PERSON_SELECT,
    orderBy: { name: 'asc' },
  })

  const children = await Promise.all(
    directReports.map(async (r) => {
      const sub = await buildTeamTree(r.id)
      return sub!
    })
  )

  return {
    id:          person.id,
    name:        person.name,
    employeeId:  person.employeeId,
    designation: person.designation,
    roles:       person.roles.map((r) => r.role),
    department:  person.department,
    unit:        person.unit,
    joiningDate: person.joiningDate,
    children,
  }
}

function flattenTeam(node: TeamMemberNode): TeamMemberNode[] {
  return [node, ...node.children.flatMap(flattenTeam)]
}

export async function getTeamOverview(managerId: string) {
  const root = await buildTeamTree(managerId)

  if (!root) {
    return { root: null, totalTeamSize: 0, departmentBreakdown: [] }
  }

  // Everyone under the manager, excluding the manager themself
  const team = root.children.flatMap(flattenTeam)

  const byDept = new Map<string, { departmentId: string; departmentName: string; count: number }>()
  for (const m of team) {
    const key = m.department.id
    const entry = byDept.get(key) ?? { departmentId: key, departmentName: m.department.name, count: 0 }
    entry.count++
    byDept.set(key, entry)
  }

  return {
    root,
    totalTeamSize:       team.length,
    departmentBreakdown: Array.from(byDept.values()).sort((a, b) => b.count - a.count),
  }
}
