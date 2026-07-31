import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { stageQuestionEdit, stageArchiveToggle, discardStagedItem, ForbiddenError } from '@/modules/assessment'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { action, ...input } = body

  try {
    if (action === 'archive') {
      const item = await stageArchiveToggle(params.itemId, false, session.user.id)
      return NextResponse.json({ item })
    }
    if (action === 'restore') {
      const item = await stageArchiveToggle(params.itemId, true, session.user.id)
      return NextResponse.json({ item })
    }

    const item = await stageQuestionEdit(params.itemId, input, session.user.id)
    return NextResponse.json({ item })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ message: error.message }, { status: 403 })
    }
    const message = error instanceof Error ? error.message : 'Update failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    await discardStagedItem(params.itemId, session.user.id)
    return NextResponse.json({ message: 'Staged question discarded' })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ message: error.message }, { status: 403 })
    }
    const message = error instanceof Error ? error.message : 'Failed to discard question'
    return NextResponse.json({ message }, { status: 400 })
  }
}
