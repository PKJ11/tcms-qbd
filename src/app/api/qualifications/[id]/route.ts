import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  getQualificationById,
  signQualification,
  rejectQualification,
} from '@/modules/qualification'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const qualification = await getQualificationById(params.id)
  if (!qualification) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ qualification })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const { justification, action } = body

  if (!justification) {
    return NextResponse.json(
      { message: 'Justification is required' },
      { status: 400 }
    )
  }

  try {
    if (action === 'sign') {
      const result = await signQualification(params.id, justification, session.user.id)
      return NextResponse.json({
        message:      result.willApprove ? 'Qualification fully approved' : 'Step signed successfully',
        fullyApproved: result.willApprove,
      })
    }

    if (action === 'reject') {
      await rejectQualification(params.id, justification, session.user.id)
      return NextResponse.json({ message: 'Qualification rejected' })
    }

    return NextResponse.json({ message: 'Unknown action' }, { status: 400 })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Operation failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}