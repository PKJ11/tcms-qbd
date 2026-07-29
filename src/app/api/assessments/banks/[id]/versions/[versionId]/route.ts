import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getQuestionBankVersionQuestions } from '@/modules/assessment'

// Read-only drill-down into a historical version's exact question set —
// trainer + viewer both need this for traceability, no extra role gate.
export async function GET(
  _req: NextRequest,
  { params }: { params: { versionId: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  try {
    const version = await getQuestionBankVersionQuestions(params.versionId)
    return NextResponse.json({ version })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Version not found'
    return NextResponse.json({ message }, { status: 404 })
  }
}
