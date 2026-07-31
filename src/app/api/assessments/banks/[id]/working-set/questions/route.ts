import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { stageNewQuestion, ForbiddenError } from '@/modules/assessment'
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

  const input = await req.json()

  try {
    const item = await stageNewQuestion(params.id, input, session.user.id)
    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ message: error.message }, { status: 403 })
    }
    const message = error instanceof Error ? error.message : 'Failed to stage question'
    return NextResponse.json({ message }, { status: 400 })
  }
}
