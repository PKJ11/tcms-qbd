import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getQuestionBankVersionQuestions } from '@/modules/assessment'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

// Read-only drill-down into a historical version's exact question set,
// including correct answers — trainer + viewer (and admin) need this for
// traceability; trainees and contractual employees must never reach it.
export async function GET(
  _req: NextRequest,
  { params }: { params: { versionId: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.VIEW_REPORTS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    const version = await getQuestionBankVersionQuestions(params.versionId)
    return NextResponse.json({ version })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Version not found'
    return NextResponse.json({ message }, { status: 404 })
  }
}
