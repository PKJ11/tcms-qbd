import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getQuestionBankByTopic } from '@/modules/assessment'
import { prisma } from '@/lib/prisma'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'
import { redactBankForViewer } from '@/modules/assessment/redact'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  // params.id here is the bankId — fetch via topic relation
  const bank = await prisma.questionBank.findUnique({
    where:  { id: params.id },
    select: { topicId: true },
  })
  if (!bank) return NextResponse.json({ message: 'Not found' }, { status: 404 })

  const fullBank = await getQuestionBankByTopic(bank.topicId)

  // Questions (and their correct answers) are only for content authors.
  const canSeeQuestions = hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)
  return NextResponse.json({ bank: canSeeQuestions ? fullBank : redactBankForViewer(fullBank) })
}
