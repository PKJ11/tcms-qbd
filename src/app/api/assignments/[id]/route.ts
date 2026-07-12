import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAssignmentById } from '@/modules/assignments'
import { hasAnyRole } from '@/lib/permissions'

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