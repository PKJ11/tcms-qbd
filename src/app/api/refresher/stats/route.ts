import { NextResponse } from 'next/server'
import { getSession }   from '@/lib/auth'
import { getRefresherStats } from '@/modules/refresher'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const stats = await getRefresherStats()
  return NextResponse.json(stats)
}