import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  getMaterialById,
  retireMaterial,
} from '@/modules/content'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const material = await getMaterialById(params.id)
  if (!material) {
    return NextResponse.json({ message: 'Material not found' }, { status: 404 })
  }

  return NextResponse.json({ material })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  if (!hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body          = await req.json()
  const { justification, action } = body

  if (!justification) {
    return NextResponse.json(
      { message: 'Justification is required' },
      { status: 400 }
    )
  }

  try {
    if (action === 'retire') {
      await retireMaterial(params.id, justification, session.user.id)
      return NextResponse.json({ message: 'Material retired successfully' })
    }

    return NextResponse.json(
      { message: 'Unknown action' },
      { status: 400 }
    )

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Operation failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}