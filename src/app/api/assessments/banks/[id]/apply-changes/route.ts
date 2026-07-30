import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { applyChangesToCurrentVersion } from '@/modules/assessment'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

// Commits the staged working set straight into the CURRENT version's real
// Question rows — no new version created. Only allowed while that version
// has never been used by an assignment/attempt.
export async function POST(
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

  const { justification } = await req.json()
  if (!justification) {
    return NextResponse.json({ message: 'Justification is required' }, { status: 400 })
  }

  try {
    const result = await applyChangesToCurrentVersion(params.id, justification, session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to apply changes'
    return NextResponse.json({ message }, { status: 400 })
  }
}
