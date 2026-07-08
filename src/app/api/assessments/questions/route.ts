import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createQuestion } from '@/modules/assessment'
import type { UserRole } from '@/lib/types'

const CAN_MANAGE: UserRole[] = ['TRAINER', 'TRAINING_HEAD', 'SUPER_ADMIN']

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!CAN_MANAGE.includes(session.user.role as UserRole)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { justification, ...input } = body

  if (!justification) {
    return NextResponse.json({ message: 'Justification is required' }, { status: 400 })
  }

  try {
    const question = await createQuestion(input, justification, session.user.id)
    return NextResponse.json({ question }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create question'
    return NextResponse.json({ message }, { status: 400 })
  }
}