import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getPasswordPolicy } from '@/modules/password-policy'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const policy = await getPasswordPolicy()
  return NextResponse.json({ policy })
}

export async function POST() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_USERS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  // The password policy is fixed and cannot be changed from the application.
  return NextResponse.json(
    { message: 'The password policy cannot be changed from the application.' },
    { status: 403 }
  )
}
