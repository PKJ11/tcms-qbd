// app/api/work-drafts/[draftKey]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Fetch the current user's draft for this key. Lazily purges an expired row and
// reports it as absent.
export async function GET(
  _req: NextRequest,
  { params }: { params: { draftKey: string } }
) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const draft = await prisma.workDraft.findUnique({
    where: { userId_draftKey: { userId: session.user.id, draftKey: params.draftKey } },
  })

  if (!draft) {
    return NextResponse.json({ message: 'No draft' }, { status: 404 })
  }

  if (draft.expiresAt.getTime() < Date.now()) {
    await prisma.workDraft
      .delete({ where: { id: draft.id } })
      .catch(() => {})
    return NextResponse.json({ message: 'No draft' }, { status: 404 })
  }

  return NextResponse.json({
    draft: {
      draftKey: draft.draftKey,
      routePath: draft.routePath,
      schemaVersion: draft.schemaVersion,
      payload: draft.payload,
      updatedAt: draft.updatedAt.toISOString(),
    },
  })
}

// Discard — on an explicit "start fresh", and after a successful real save.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { draftKey: string } }
) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  await prisma.workDraft.deleteMany({
    where: { userId: session.user.id, draftKey: params.draftKey },
  })

  return NextResponse.json({ ok: true })
}
