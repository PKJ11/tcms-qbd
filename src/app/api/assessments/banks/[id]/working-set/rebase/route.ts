import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { rebaseWorkingSet, ForbiddenError } from '@/modules/assessment'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { baseVersionId } = await req.json()
  if (!baseVersionId) {
    return NextResponse.json({ message: 'baseVersionId is required' }, { status: 400 })
  }

  try {
    const workingSet = await rebaseWorkingSet(params.id, baseVersionId, session.user.id)
    return NextResponse.json({ workingSet })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ message: error.message }, { status: 403 })
    }
    const message = error instanceof Error ? error.message : 'Failed to switch version'
    return NextResponse.json({ message }, { status: 400 })
  }
}
