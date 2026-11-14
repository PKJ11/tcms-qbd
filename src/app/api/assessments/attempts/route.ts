import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma }     from '@/lib/prisma'
import { hasAnyRole } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const assignmentId     = searchParams.get('assignmentId')
  const bankId           = searchParams.get('bankId')

  // Build where clause — scoped to this person, AND filtered by assignmentId or bankId when provided.
  // Reviewers (Administrator, Viewer, Trainer, Guest Trainer — the roles that may open any assignment page)
  // can read the attempt history of a specific assignment (read-only), per OQ 8.1.16 8.1/9.1.
  const isReviewer = hasAnyRole(session.user, ['ADMINISTRATOR', 'VIEWER', 'TRAINER', 'GUEST_TRAINER'])
  const where: Record<string, unknown> = (assignmentId && isReviewer)
    ? {}
    : { personId: session.user.id }

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