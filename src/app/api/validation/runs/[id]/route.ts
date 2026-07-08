import { NextRequest, NextResponse } from 'next/server'
import { getSession }                 from '@/lib/auth'
import { getValidationRunDetail, completeValidationRun } from '@/modules/validation'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })

  const run = await getValidationRunDetail(params.id)
  if (!run) return NextResponse.json({ message: 'Not found' }, { status: 404 })

  return NextResponse.json({ run })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })

  const { notes } = await req.json()

  try {
    const result = await completeValidationRun(params.id, notes ?? '', session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}