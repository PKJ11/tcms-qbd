import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAttemptQuestions } from '@/modules/assessment'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { bankId, assignmentId } = await req.json()

  if (!bankId || !assignmentId) {
    return NextResponse.json({ message: 'bankId and assignmentId required' }, { status: 400 })
  }

  try {
    const result = await getAttemptQuestions(bankId, assignmentId, session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start attempt'
    return NextResponse.json({ message }, { status: 400 })
  }
}