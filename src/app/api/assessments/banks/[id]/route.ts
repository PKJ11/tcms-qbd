import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getQuestionBankByTopic, updateQuestionBank } from '@/modules/assessment'
import { prisma } from '@/lib/prisma'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { justification, ...input } = body

  if (!justification) {
    return NextResponse.json({ message: 'Justification is required' }, { status: 400 })
  }

  try {
    const bank = await updateQuestionBank(params.id, input, justification, session.user.id)
    return NextResponse.json({ bank })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}