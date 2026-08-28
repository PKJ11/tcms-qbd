import { NextResponse } from 'next/server'
import { getSession }   from '@/lib/auth'
import { getTeamOverview } from '@/modules/topic-groups'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

// Trainer's full reporting chain (direct + indirect reports), grouped by
// department, for the "My Team" tab's interactive view + chart.
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_TOPIC_GROUPS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const overview = await getTeamOverview(session.user.id)
  return NextResponse.json(overview)
}
