import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { logAuthEvent } from '@/modules/audit-trail'
import { getPasswordPolicy } from '@/lib/password-policy'

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json(
      { message: 'Unauthorised' },
      { status: 401 }
    )
  }

  const { currentPassword, newPassword } = await req.json()

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { message: 'Both fields are required' },
      { status: 400 }
    )
  }

  const policy = await getPasswordPolicy()
  const historyDepth = Math.max(1, policy.passwordHistoryCount)

  if (newPassword.length < policy.minPasswordLength) {
    return NextResponse.json(
      { message: `Password must be at least ${policy.minPasswordLength} characters` },
      { status: 400 }
    )
  }

  const person = await prisma.person.findUnique({
    where: { id: session.user.id },
  })

  if (!person) {
    return NextResponse.json(
      { message: 'User not found' },
      { status: 404 }
    )
  }

  const valid = await bcrypt.compare(currentPassword, person.passwordHash)
  if (!valid) {
    return NextResponse.json(
      { message: 'Current password is incorrect' },
      { status: 400 }
    )
  }

  // Cannot reuse any of the last N passwords (current hash + N-1 history rows)
  const recentHistory = await prisma.passwordHistory.findMany({
    where:   { personId: person.id },
    orderBy: { createdAt: 'desc' },
    take:    historyDepth - 1,
  })

  const previousHashes = [person.passwordHash, ...recentHistory.map((h) => h.passwordHash)]
  for (const hash of previousHashes) {
    if (await bcrypt.compare(newPassword, hash)) {
      return NextResponse.json(
        { message: `You cannot reuse any of your last ${historyDepth} passwords` },
        { status: 400 }
      )
    }
  }

  const newHash = await bcrypt.hash(newPassword, 12)

  await prisma.passwordHistory.create({
    data: { personId: person.id, passwordHash: person.passwordHash },
  })

  // Keep only the N-1 most recent history rows (current + N-1 = last N tracked)
  const staleHistory = await prisma.passwordHistory.findMany({
    where:   { personId: person.id },
    orderBy: { createdAt: 'desc' },
    skip:    historyDepth - 1,
    select:  { id: true },
  })
  if (staleHistory.length > 0) {
    await prisma.passwordHistory.deleteMany({
      where: { id: { in: staleHistory.map((h) => h.id) } },
    })
  }

  await prisma.person.update({
    where: { id: session.user.id },
    data: {
      passwordHash:       newHash,
      mustChangePassword: false,
      passwordChangedAt:  new Date(),
    },
  })

  // ── Audit log — WHO changed password, WHEN, WHAT, WHY ──
  await logAuthEvent({
    userId:    session.user.id,
    action:    'PASSWORD_CHANGE',
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
    userAgent: req.headers.get('user-agent')      ?? undefined,
  })

  return NextResponse.json(
    { message: 'Password updated successfully' },
    { status: 200 }
  )
}