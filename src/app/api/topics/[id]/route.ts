import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  getTopicById,
  updateTopic,
  deactivateTopic,
} from '@/modules/topics'
import type { UserRole } from '@/lib/types'

const CAN_MODIFY: UserRole[] = ['TRAINING_HEAD', 'ADMINISTRATOR']

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const topic = await getTopicById(params.id)
  if (!topic) {
    return NextResponse.json({ message: 'Topic not found' }, { status: 404 })
  }

  return NextResponse.json({ topic })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  if (!CAN_MODIFY.includes(session.user.role as UserRole)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { justification, action, ...input } = body

  if (!justification) {
    return NextResponse.json(
      { message: 'Justification is required' },
      { status: 400 }
    )
  }

  try {
    if (action === 'deactivate') {
      await deactivateTopic(params.id, justification, session.user.id)
      return NextResponse.json({ message: 'Topic deactivated successfully' })
    }

    const topic = await updateTopic(
      params.id,
      input,
      justification,
      session.user.id
    )
    return NextResponse.json({ topic })

  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Operation failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}