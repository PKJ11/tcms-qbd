import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTopicAccess, addTopicCollaborator } from '@/modules/topics'
import { ForbiddenError } from '@/lib/errors'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

// GET — who owns this topic, who's been granted access, and (owner only)
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
    const access = await getTopicAccess(params.id, session.user.id)
    return NextResponse.json(access)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load access list'
    return NextResponse.json({ message }, { status: 400 })
  }
}

// POST — grant a trainer access to upload material / manage questions. Owner only.
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

  const { personId, justification } = await req.json()
  if (!personId) {
    return NextResponse.json({ message: 'personId is required' }, { status: 400 })
  }
  if (!justification) {
    return NextResponse.json({ message: 'Justification is required' }, { status: 400 })
  }

  try {
    const collaborator = await addTopicCollaborator(params.id, personId, session.user.id, justification)
    return NextResponse.json({ collaborator }, { status: 201 })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ message: error.message }, { status: 403 })
    }
    const message = error instanceof Error ? error.message : 'Failed to grant access'
    return NextResponse.json({ message }, { status: 400 })
  }
}
