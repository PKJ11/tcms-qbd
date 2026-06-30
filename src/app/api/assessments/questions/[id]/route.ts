import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { updateQuestion, deactivateQuestion } from '@/modules/assessment'
import type { UserRole } from '@/lib/types'

const CAN_MANAGE: UserRole[] = ['TRAINER', 'TRAINING_HEAD', 'SUPER_ADMIN']

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!CAN_MANAGE.includes(session.user.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { justification, action, ...input } = body

  if (!justification) {
    return NextResponse.json({ message: 'Justification is required' }, { status: 400 })
  }

  try {
    if (action === 'deactivate') {
      await deactivateQuestion(params.id, justification, session.user.id)
      return NextResponse.json({ message: 'Question deactivated' })
    }

    const question = await updateQuestion(params.id, input, justification, session.user.id)
    return NextResponse.json({ question })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}