import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getQuestionBankByTopic } from '@/modules/assessment'

export async function GET(
  _req: NextRequest,
  { params }: { params: { topicId: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const bank = await getQuestionBankByTopic(params.topicId)
  return NextResponse.json({ bank })
}