import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getQuestionBankByTopic } from '@/modules/assessment'
import { prisma } from '@/lib/prisma'

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
  return NextResponse.json({ bank: fullBank })
}