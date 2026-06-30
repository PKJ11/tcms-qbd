import { NextRequest, NextResponse } from 'next/server'
import { getSession }             from '@/lib/auth'
import { acknowledgeAssignment }  from '@/modules/assignments'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  try {
    const result = await acknowledgeAssignment(params.id, session.user.id)
    return NextResponse.json({
      message:   'Acknowledged successfully',
      completed: result.completed,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to acknowledge'
    return NextResponse.json({ message }, { status: 400 })
  }
}