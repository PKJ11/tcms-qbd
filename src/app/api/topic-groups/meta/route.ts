import { NextResponse } from 'next/server'
import { getSession }   from '@/lib/auth'
import { getActiveTopicsForGrouping, getMyGroupingScope } from '@/modules/topic-groups'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

// Dropdown/palette data for the Topic Group builder — active topics plus
// the trainer's own department/unit ("their team") + that unit's sections.
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_TOPIC_GROUPS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const [topics, scope] = await Promise.all([
    getActiveTopicsForGrouping(),
    getMyGroupingScope(session.user.id),
  ])

  return NextResponse.json({ topics, scope })
}
