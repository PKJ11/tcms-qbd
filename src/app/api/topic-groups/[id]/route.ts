import { NextRequest, NextResponse } from 'next/server'
import { getSession }   from '@/lib/auth'
import { updateTopicGroupTopics, renameTopicGroup, deactivateTopicGroup } from '@/modules/topic-groups'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_TOPIC_GROUPS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { justification, name, topicIds } = body

  if (!justification) {
    return NextResponse.json(
      { message: 'Justification is required' },
      { status: 400 }
    )
  }

  try {
    if (typeof name === 'string') {
      const group = await renameTopicGroup(params.id, name, justification, session.user.id)
      return NextResponse.json({ group })
    }

    const group = await updateTopicGroupTopics(params.id, { topicIds: topicIds ?? [] }, justification, session.user.id)
    return NextResponse.json({ group })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update topic group'
    return NextResponse.json({ message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_TOPIC_GROUPS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const justification = searchParams.get('justification')

  if (!justification) {
    return NextResponse.json(
      { message: 'Justification is required' },
      { status: 400 }
    )
  }

  try {
    const group = await deactivateTopicGroup(params.id, justification, session.user.id)
    return NextResponse.json({ group })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate topic group'
    return NextResponse.json({ message }, { status: 400 })
  }
}
