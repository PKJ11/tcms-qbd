import { NextRequest, NextResponse } from 'next/server'
import { getSession }   from '@/lib/auth'
import { getTopicGroups, createTopicGroup } from '@/modules/topic-groups'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_TOPIC_GROUPS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const groups = await getTopicGroups(session.user.id)
  return NextResponse.json({ groups })
}

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_TOPIC_GROUPS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { justification, ...input } = body

  if (!justification) {
    return NextResponse.json(
      { message: 'Justification is required' },
      { status: 400 }
    )
  }

  try {
    const group = await createTopicGroup(input, justification, session.user.id)
    return NextResponse.json({ group }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create topic group'
    return NextResponse.json({ message }, { status: 400 })
  }
}
