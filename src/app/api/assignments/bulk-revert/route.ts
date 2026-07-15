import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { revertAssignments } from '@/modules/assignments'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  // Same gate as single-assignment revert — any Trainer/Guest Trainer or
  // Administrator can revert a mistaken assignment.
  if (!hasAnyRole(session.user, [...PERMISSIONS.ASSIGN_TRAINING, 'ADMINISTRATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { justification, assignmentIds } = body

  if (!justification) {
    return NextResponse.json({ message: 'Justification is required' }, { status: 400 })
  }
  if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
    return NextResponse.json({ message: 'No assignments selected' }, { status: 400 })
  }

  try {
    const result = await revertAssignments(assignmentIds, justification, session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bulk revert failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}
