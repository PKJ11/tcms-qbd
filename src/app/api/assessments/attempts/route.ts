import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma }     from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const assignmentId     = searchParams.get('assignmentId')
  const bankId           = searchParams.get('bankId')

  // Build where clause — ALWAYS scope to this person
  // AND filter by assignmentId or bankId when provided
  const where: Record<string, unknown> = {
    personId: session.user.id,
  }

  if (assignmentId) where.assignmentId = assignmentId
  if (bankId)       where.bankId       = bankId

  const attempts = await prisma.assessmentAttempt.findMany({
    where,
    select: {
      id:          true,
      attemptNo:   true,
      score:       true,
      outcome:     true,
      startedAt:   true,
      submittedAt: true,
      assignmentId: true,
      bankId:      true,
    },
    orderBy: { submittedAt: 'desc' },
  })

  return NextResponse.json({ attempts })
}