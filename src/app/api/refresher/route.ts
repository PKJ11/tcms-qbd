import { NextRequest, NextResponse } from 'next/server'
import { getSession }   from '@/lib/auth'
import { getRefreshers, getMyRefreshers, createRefreshers } from '@/modules/refresher'
import type { UserRole } from '@/lib/types'

const CAN_TRIGGER: UserRole[] = ['TRAINING_HEAD', 'SUPER_ADMIN']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const view = searchParams.get('view')

  if (view === 'mine') {
    const refreshers = await getMyRefreshers(session.user.id)
    return NextResponse.json({ refreshers })
  }

  if (!CAN_TRIGGER.includes(session.user.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const refreshers = await getRefreshers({
    personId:    searchParams.get('personId')    ?? undefined,
    topicId:     searchParams.get('topicId')     ?? undefined,
    status:      searchParams.get('status')      ?? undefined,
    triggerType: searchParams.get('triggerType') ?? undefined,
  })

  return NextResponse.json({ refreshers })
}

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!CAN_TRIGGER.includes(session.user.role)) {
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
    const result = await createRefreshers(input, justification, session.user.id)
    return NextResponse.json({ result }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create refresher'
    return NextResponse.json({ message }, { status: 400 })
  }
}