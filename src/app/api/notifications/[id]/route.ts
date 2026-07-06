import { NextRequest, NextResponse } from 'next/server'
import { getSession }              from '@/lib/auth'
import { markNotificationRead }    from '@/modules/notifications'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  await markNotificationRead(params.id, session.user.id)
  return NextResponse.json({ message: 'Marked as read' })
}