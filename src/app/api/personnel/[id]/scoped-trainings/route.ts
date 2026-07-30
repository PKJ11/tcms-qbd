import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  getScopedTrainingsForTransfer,
  assignScopedTrainingsOnTransfer,
  getAssignments,
} from '@/modules/assignments'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_USERS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const departmentId = searchParams.get('departmentId')
  const unitId        = searchParams.get('unitId')
  const sectionId      = searchParams.get('sectionId') ?? undefined

  if (!departmentId || !unitId) {
    return NextResponse.json(
      { message: 'departmentId and unitId are required' },
      { status: 400 }
    )
  }

  const [trainings, allAssignments] = await Promise.all([
    getScopedTrainingsForTransfer(params.id, departmentId, unitId, sectionId),
    getAssignments({ personId: params.id }),
  ])

  // Full history of every training ever assigned to this person, regardless
  // of department/scope — so the admin has complete context before deciding
  // what to (re-)assign as part of the transfer, not just the new scope's topics.
  const history = allAssignments
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((a) => ({
      id:          a.id,
      topicName:   a.topic.name,
      status:      a.status,
      trigger:     a.trigger,
      dueDate:     a.dueDate,
      completedAt: a.completedAt,
      assignedBy:  a.assignedBy.name,
    }))

  return NextResponse.json({ trainings, history })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_USERS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { topicIds, dueDate, justification } = body

  if (!Array.isArray(topicIds) || topicIds.length === 0) {
    return NextResponse.json({ message: 'topicIds is required' }, { status: 400 })
  }
  if (!dueDate) {
    return NextResponse.json({ message: 'dueDate is required' }, { status: 400 })
  }
  if (!justification) {
    return NextResponse.json({ message: 'Justification is required' }, { status: 400 })
  }

  try {
    const result = await assignScopedTrainingsOnTransfer(
      params.id,
      topicIds,
      dueDate,
      session.user.id,
      justification
    )
    return NextResponse.json({ result }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to assign trainings'
    return NextResponse.json({ message }, { status: 400 })
  }
}
