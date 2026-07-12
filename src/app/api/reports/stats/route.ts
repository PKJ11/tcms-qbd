import { NextResponse }          from 'next/server'
import { getSession }            from '@/lib/auth'
import {
  getTrainingHeadStats,
  getReviewerStats,
} from '@/modules/reports'
import { hasAnyRole } from '@/lib/permissions'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  if (hasAnyRole(session.user, ['TRAINER', 'GUEST_TRAINER'])) {
    const stats = await getTrainingHeadStats()
    return NextResponse.json({ stats, type: 'training_head' })
  }

  if (hasAnyRole(session.user, ['ADMINISTRATOR', 'VIEWER'])) {
    const stats = await getReviewerStats()
    return NextResponse.json({ stats, type: 'reviewer' })
  }

  return NextResponse.json({ stats: null, type: 'user' })
}