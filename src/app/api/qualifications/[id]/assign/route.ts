import { NextRequest, NextResponse } from 'next/server'
import { getSession }    from '@/lib/auth'
import { assignSignatory } from '@/modules/qualification'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { assigneeId } = await req.json()
  if (!assigneeId) {
    return NextResponse.json({ message: 'assigneeId is required' }, { status: 400 })
  }

  try {
    const result = await assignSignatory(params.id, assigneeId, session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to assign approver'
    return NextResponse.json({ message }, { status: 400 })
  }
}
