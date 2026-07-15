import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAssignmentById, revertAssignment } from '@/modules/assignments'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const assignment = await getAssignmentById(params.id)
  if (!assignment) {
    return NextResponse.json({ message: 'Assignment not found' }, { status: 404 })
  }

  // Non-elevated users (e.g. Trainee) can only view their own assignment
  const isElevated = hasAnyRole(session.user, ['ADMINISTRATOR', 'VIEWER', 'TRAINER', 'GUEST_TRAINER'])
  if (!isElevated && assignment.person.id !== session.user.id) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ assignment })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  // Any Trainer/Guest Trainer or Administrator can revert a mistaken
  // assignment, regardless of who originally assigned it.
  if (!hasAnyRole(session.user, [...PERMISSIONS.ASSIGN_TRAINING, 'ADMINISTRATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { justification, action } = body

  if (!justification) {
    return NextResponse.json({ message: 'Justification is required' }, { status: 400 })
  }

  try {
    if (action === 'revert') {
      await revertAssignment(params.id, justification, session.user.id)
      return NextResponse.json({ message: 'Assignment reverted successfully' })
    }

    return NextResponse.json({ message: 'Unknown action' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Operation failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}