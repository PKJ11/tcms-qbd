import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  getAssignments,
  getMyAssignments,
  createAssignments,
  personHasSubordinates,
} from '@/modules/assignments'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

const CAN_VIEW_ALL_ORGS = ['TRAINER', 'GUEST_TRAINER', 'VIEWER'] as const

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const view = searchParams.get('view')

  if (view === 'mine') {
    const assignments = await getMyAssignments(session.user.id)
    return NextResponse.json({ assignments })
  }

  // Org-wide visibility — Trainer, Guest Trainer, Viewer
  if (hasAnyRole(session.user, [...CAN_VIEW_ALL_ORGS])) {
    const assignments = await getAssignments({
      personId: searchParams.get('personId') ?? undefined,
      topicId:  searchParams.get('topicId')  ?? undefined,
      status:   searchParams.get('status')   ?? undefined,
      trigger:  searchParams.get('trigger')  ?? undefined,
    })
    return NextResponse.json({ assignments })
  }

  // Anyone else — check if they actually have subordinates
  const hasSubordinates = await personHasSubordinates(session.user.id)

  if (!hasSubordinates) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const assignments = await getAssignments({
    personId:  searchParams.get('personId') ?? undefined,
    topicId:   searchParams.get('topicId')  ?? undefined,
    status:    searchParams.get('status')   ?? undefined,
    trigger:   searchParams.get('trigger')  ?? undefined,
    managerId: session.user.id, // subordinates of THIS person, regardless of their role label
  })

  return NextResponse.json({ assignments })
}

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  if (!hasAnyRole(session.user, PERMISSIONS.ASSIGN_TRAINING)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { justification, ...input } = body

  if (!justification) {
    return NextResponse.json(
      { message: 'Justification is required' },
      { status: 400 }
    )
  }

  try {
    const result = await createAssignments(input, justification, session.user.id)
    return NextResponse.json({ result }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create assignment'
    return NextResponse.json({ message }, { status: 400 })
  }
}