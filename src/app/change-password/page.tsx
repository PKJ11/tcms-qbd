import { NextRequest, NextResponse } from 'next/server'
import { getSession }  from '@/lib/auth'
import { prisma }      from '@/lib/prisma'
import bcrypt          from 'bcryptjs'
import { logAuditEvent } from '@/modules/audit-trail'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { currentPassword, newPassword } = await req.json()

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { message: 'Current and new password are required' },
      { status: 400 }
    )
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { message: 'New password must be at least 8 characters' },
      { status: 400 }
    )
  }

  // Look up by ID from session — most reliable
  const person = await prisma.person.findUnique({
    where:  { id: session.user.id },
    select: { id: true, passwordHash: true, employeeId: true },
  })

  if (!person || !person.passwordHash) {
    return NextResponse.json({ message: 'Account not found' }, { status: 404 })
  }

  // Verify current password
  const valid = await bcrypt.compare(currentPassword, person.passwordHash)
  if (!valid) {
    return NextResponse.json(
      { message: 'Current password is incorrect' },
      { status: 400 }
    )
  }

  // Hash and save new password
  const newHash = await bcrypt.hash(newPassword, 12)

  await prisma.person.update({
    where: { id: person.id },
    data:  {
      passwordHash:       newHash,
      mustChangePassword: false,
    },
  })

  await logAuditEvent({
    userId:        person.id,
    action:        'UPDATE',
    module:        'AUTH',
    recordId:      person.id,
    recordType:    'Person',
    beforeValue:   { mustChangePassword: true  },
    afterValue:    { mustChangePassword: false, passwordChanged: true },
    justification: 'User changed their password on first login',
  })

  return NextResponse.json({ message: 'Password changed successfully' })
}