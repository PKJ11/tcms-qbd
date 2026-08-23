import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { saveQuestionBankVersion, getQuestionBankVersions, ForbiddenError } from '@/modules/assessment'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

// GET — version history, readable by anyone authenticated (trainer + viewer)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const versions = await getQuestionBankVersions(params.id)
  return NextResponse.json({ versions })
}

// POST — Save Changes: commits the working set as a new version
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
    const result = await saveQuestionBankVersion(params.id, justification, session.user.id)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ message: error.message }, { status: 403 })
    }
    const message = error instanceof Error ? error.message : 'Failed to save version'
    return NextResponse.json({ message }, { status: 400 })
  }
}
