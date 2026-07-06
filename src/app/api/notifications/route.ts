import { NextRequest, NextResponse } from 'next/server'
import { getSession }          from '@/lib/auth'
import {
  getNotifications,
  markAllNotificationsRead,
} from '@/modules/notifications'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const onlyUnread = searchParams.get('unread') === 'true'

  const result = await getNotifications(session.user.id, onlyUnread)
  return NextResponse.json(result)
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { action } = await req.json()

  if (action === 'markAllRead') {
    await markAllNotificationsRead(session.user.id)
    return NextResponse.json({ message: 'All notifications marked as read' })
  }

  return NextResponse.json({ message: 'Unknown action' }, { status: 400 })
}