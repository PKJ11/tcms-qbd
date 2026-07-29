import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getWorkingSet } from '@/modules/assessment'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    const workingSet = await getWorkingSet(params.id, session.user.id)
    return NextResponse.json({ workingSet })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load working set'
    return NextResponse.json({ message }, { status: 400 })
  }
}
