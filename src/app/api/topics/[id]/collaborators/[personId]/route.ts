import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { removeTopicCollaborator } from '@/modules/topics'
import { ForbiddenError } from '@/lib/errors'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

// DELETE — revoke a trainer's access to this topic. Owner only.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; personId: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { justification } = await req.json().catch(() => ({ justification: undefined }))
  if (!justification) {
    return NextResponse.json({ message: 'Justification is required' }, { status: 400 })
  }

  try {
    await removeTopicCollaborator(params.id, params.personId, session.user.id, justification)
    return NextResponse.json({ message: 'Access revoked' })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ message: error.message }, { status: 403 })
    }
    const message = error instanceof Error ? error.message : 'Failed to revoke access'
    return NextResponse.json({ message }, { status: 400 })
  }
}
