import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getQuestionBankByTopic } from '@/modules/assessment'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'
import { redactBankForViewer } from '@/modules/assessment/redact'

export async function GET(
  _req: NextRequest,
  { params }: { params: { topicId: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const bank = await getQuestionBankByTopic(params.topicId)

  // Questions (and their correct answers) are only for content authors.
  // Everyone else — trainees in particular — gets the bank settings only.
  const canSeeQuestions = hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)
  return NextResponse.json({ bank: canSeeQuestions ? bank : redactBankForViewer(bank) })
}
