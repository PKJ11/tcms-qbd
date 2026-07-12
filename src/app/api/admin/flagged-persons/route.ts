import { NextResponse }  from 'next/server'
import { getSession }    from '@/lib/auth'
import { prisma }        from '@/lib/prisma'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_USERS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const persons = await prisma.person.findMany({
    where: { flaggedForJobReassignment: true },
    select: {
      id:             true,
      name:           true,
      employeeId:     true,
      designation:    true,
      flaggedAt:      true,
      flagReason:     true,
      flagCycleCount: true,
      flagTopicId:    true,
      department:     { select: { name: true } },
      manager:        { select: { name: true } },
    },
    orderBy: { flaggedAt: 'desc' },
  })

  // Fetch topic names for each flagged person
  const topicIds = persons
    .map((p) => p.flagTopicId)
    .filter((id): id is string => !!id)

  const topics = topicIds.length > 0
    ? await prisma.trainingTopic.findMany({
        where:  { id: { in: topicIds } },
        select: { id: true, name: true },
      })
    : []

  const topicMap = new Map(topics.map((t) => [t.id, t.name]))

  const enriched = persons.map((p) => ({
    ...p,
    flagTopicName: p.flagTopicId ? topicMap.get(p.flagTopicId) ?? null : null,
  }))

  return NextResponse.json({ persons: enriched })
}