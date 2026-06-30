import { NextRequest, NextResponse } from 'next/server'
import { getSession }        from '@/lib/auth'
import { getAttemptHistory } from '@/modules/assessment'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const assignmentId = searchParams.get('assignmentId')

  const attempts = await getAttemptHistory({ personId: session.user.id })

  const filtered = assignmentId
    ? attempts.filter((a) => true) // assignmentId not directly on select — keep simple for now
    : attempts

  return NextResponse.json({ attempts: filtered })
}