import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  getAssignments,
  getMyAssignments,
  createAssignments,
} from '@/modules/assignments'
import type { UserRole } from '@/lib/types'

const CAN_ASSIGN: UserRole[] = ['TRAINING_HEAD', 'SUPER_ADMIN']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const view = searchParams.get('view') // 'mine' or 'all'

  // Regular users always see only their own
  if (session.user.role === 'USER' || view === 'mine') {
    const assignments = await getMyAssignments(session.user.id)
    return NextResponse.json({ assignments })
  }

  // Admin roles can see all, optionally filtered
  if (!['MANAGER', 'TRAINER', 'TRAINING_HEAD', 'SUPER_ADMIN', 'MD'].includes(session.user.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const assignments = await getAssignments({
    personId: searchParams.get('personId') ?? undefined,
    topicId:  searchParams.get('topicId')  ?? undefined,
    status:   searchParams.get('status')   ?? undefined,
    trigger:  searchParams.get('trigger')  ?? undefined,
    unitId:   session.user.role === 'MANAGER' ? session.user.unitId : undefined,
  })

  return NextResponse.json({ assignments })
}

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  if (!CAN_ASSIGN.includes(session.user.role)) {
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
    const result = await createAssignments(input, justification, session.user.id)
    return NextResponse.json({ result }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create assignment'
    return NextResponse.json({ message }, { status: 400 })
  }
}