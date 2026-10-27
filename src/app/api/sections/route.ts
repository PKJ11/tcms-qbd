import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createSection } from '@/modules/organization'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_ORG)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { justification, password, ...input } = body

  if (!justification) {
    return NextResponse.json(
      { message: 'Justification is required' },
      { status: 400 }
    )
  }
  if (!password) {
    return NextResponse.json(
      { message: 'Password is required' },
      { status: 400 }
    )
  }

  try {
    const section = await createSection(input, justification, session.user.id, password)
    return NextResponse.json({ section }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create section'
    return NextResponse.json({ message }, { status: 400 })
  }
}
