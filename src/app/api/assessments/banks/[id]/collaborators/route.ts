import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getQuestionBankAccess, addQuestionBankCollaborator, ForbiddenError } from '@/modules/assessment'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

// GET — who owns this bank, who's been granted access, and (owner only)
// who else could be granted access. Readable by any Trainer/Guest Trainer.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    const access = await getQuestionBankAccess(params.id, session.user.id)
    return NextResponse.json(access)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load access list'
    return NextResponse.json({ message }, { status: 400 })
  }
}

// POST — grant a trainer edit access. Owner only.
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

  const { personId } = await req.json()
  if (!personId) {
    return NextResponse.json({ message: 'personId is required' }, { status: 400 })
  }

  try {
    const collaborator = await addQuestionBankCollaborator(params.id, personId, session.user.id)
    return NextResponse.json({ collaborator }, { status: 201 })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ message: error.message }, { status: 403 })
    }
    const message = error instanceof Error ? error.message : 'Failed to grant access'
    return NextResponse.json({ message }, { status: 400 })
  }
}
