import { NextResponse }          from 'next/server'
import { getSession }            from '@/lib/auth'
import {
  getTrainingHeadStats,
  getManagerStats,
  getMDStats,
} from '@/modules/reports'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { role, id: userId } = session.user

  if (role === 'MD') {
    const stats = await getMDStats()
    return NextResponse.json({ stats, type: 'md' })
  }

  if (['TRAINING_HEAD', 'SUPER_ADMIN'].includes(role)) {
    const stats = await getTrainingHeadStats()
    return NextResponse.json({ stats, type: 'training_head' })
  }

  if (role === 'MANAGER') {
    const stats = await getManagerStats(userId)
    return NextResponse.json({ stats, type: 'manager' })
  }

  return NextResponse.json({ stats: null, type: 'user' })
}