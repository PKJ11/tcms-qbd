import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { removeQuestionBankCollaborator, ForbiddenError } from '@/modules/assessment'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

// DELETE — revoke a trainer's edit access. Owner only.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; personId: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    await removeQuestionBankCollaborator(params.id, params.personId, session.user.id)
    return NextResponse.json({ message: 'Access revoked' })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ message: error.message }, { status: 403 })
    }
    const message = error instanceof Error ? error.message : 'Failed to revoke access'
    return NextResponse.json({ message }, { status: 400 })
  }
}
