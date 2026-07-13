import { NextRequest, NextResponse } from 'next/server'
import { getSession }             from '@/lib/auth'
import { markAssignmentViewed }   from '@/modules/assignments'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  try {
    const result = await markAssignmentViewed(params.id, session.user.id)
    return NextResponse.json({
      message:   'Marked as viewed',
      completed: result.completed,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark as viewed'
    return NextResponse.json({ message }, { status: 400 })
  }
}
