import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { approveMaterialVersion } from '@/modules/content'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  if (!hasAnyRole(session.user, PERMISSIONS.APPROVE_CONTENT)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { justification } = await req.json()

  if (!justification) {
    return NextResponse.json(
      { message: 'Justification is required' },
      { status: 400 }
    )
  }

  try {
    await approveMaterialVersion(
      params.versionId,
      justification,
      session.user.id
    )
    return NextResponse.json({ message: 'Version approved successfully' })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Approval failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}