// app/api/work-drafts/purge/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Delete every expired draft. Safe to call from a cron service, a scheduled
// task, or manually. Drafts are scratch state, so no auth gate / audit entry is
// needed — this only removes rows already past their 7-day TTL.
export async function POST() {
  try {
    const { count } = await prisma.workDraft.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
    return NextResponse.json({ message: 'Purge complete', deleted: count })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Purge failed'
    return NextResponse.json({ message }, { status: 500 })
  }
}
