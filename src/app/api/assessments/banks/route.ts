import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  getAllQuestionBanks,
  createQuestionBank,
  getTopicsWithoutBank,
} from '@/modules/assessment'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const [banks, topicsWithoutBank] = await Promise.all([
    getAllQuestionBanks(),
    getTopicsWithoutBank(),
  ])

  return NextResponse.json({ banks, topicsWithoutBank })
}

export async function POST(req: NextRequest) {
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
    const bank = await createQuestionBank(input, justification, session.user.id)
    return NextResponse.json({ bank }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create question bank'
    return NextResponse.json({ message }, { status: 400 })
  }
}