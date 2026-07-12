import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { revokeTrainerCertificate } from '@/modules/trainer-cert'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_QUALIFICATIONS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { justification, reason } = await req.json()

  if (!justification || !reason) {
    return NextResponse.json(
      { message: 'Justification and reason are required' },
      { status: 400 }
    )
  }

  try {
    await revokeTrainerCertificate(params.id, reason, justification, session.user.id)
    return NextResponse.json({ message: 'Certificate revoked successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Revocation failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}