import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { logAuthEvent } from '@/modules/audit-trail'

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

  if (newPassword.length < 8) {
    return NextResponse.json(
      { message: 'Password must be at least 8 characters' },
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

  const newHash = await bcrypt.hash(newPassword, 12)

  await prisma.person.update({
    where: { id: session.user.id },
    data: {
      passwordHash:       newHash,
      mustChangePassword: false,
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