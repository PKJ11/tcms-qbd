import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAllTechniques, createTechnique } from '@/modules/qualification'
import { canManageQualifications } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)

  const techniques = await getAllTechniques({
    departmentId: searchParams.get('departmentId') ?? undefined,
    isActive:     searchParams.get('isActive') === 'false' ? false : true,
  })

  return NextResponse.json({ techniques })
}

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!canManageQualifications(session.user)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { justification, ...input } = body

  if (!justification) {
    return NextResponse.json(
      { message: 'Justification is required' },
      { status: 400 }
    )
  }

  try {
    const technique = await createTechnique(input, justification, session.user.id)
    return NextResponse.json({ technique }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create technique'
    return NextResponse.json({ message }, { status: 400 })
  }
}