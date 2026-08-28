// app/api/work-drafts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  WORK_DRAFT_MAX_BYTES,
  WORK_DRAFT_TTL_MS,
  isSafeInternalPath,
  serializedByteLength,
} from '@/lib/work-drafts'

// Upsert the current user's draft for a given key. Called on a debounce while
// editing, when the idle warning appears, and (best-effort, keepalive) as
// logout begins.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  const { draftKey, routePath, schemaVersion, payload } = (body ?? {}) as Record<string, unknown>

  if (typeof draftKey !== 'string' || draftKey.length === 0 || draftKey.length > 200) {
    return NextResponse.json({ message: 'draftKey is required' }, { status: 400 })
  }
  if (!isSafeInternalPath(typeof routePath === 'string' ? routePath : undefined)) {
    return NextResponse.json({ message: 'routePath must be an internal path' }, { status: 400 })
  }
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    return NextResponse.json({ message: 'schemaVersion must be a positive integer' }, { status: 400 })
  }
  if (payload === undefined) {
    return NextResponse.json({ message: 'payload is required' }, { status: 400 })
  }
  if (serializedByteLength(payload) > WORK_DRAFT_MAX_BYTES) {
    return NextResponse.json({ message: 'Draft is too large to sync' }, { status: 413 })
  }

  const expiresAt = new Date(Date.now() + WORK_DRAFT_TTL_MS)

  await prisma.workDraft.upsert({
    where: { userId_draftKey: { userId: session.user.id, draftKey } },
    create: {
      userId: session.user.id,
      draftKey,
      routePath: routePath as string,
      schemaVersion,
      payload: payload as never,
      expiresAt,
    },
    update: {
      routePath: routePath as string,
      schemaVersion,
      payload: payload as never,
      expiresAt,
    },
  })

  return NextResponse.json({ ok: true })
}
