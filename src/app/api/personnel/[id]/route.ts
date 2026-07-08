import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  getPersonById,
  updatePerson,
  deactivatePerson,
  resetPersonPassword,
} from '@/modules/personnel'
import type { UserRole } from '@/lib/types'

const CAN_MODIFY: UserRole[] = ['TRAINING_HEAD', 'SUPER_ADMIN']

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const person = await getPersonById(params.id)
  if (!person) {
    return NextResponse.json({ message: 'Person not found' }, { status: 404 })
  }

  return NextResponse.json({ person })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  if (!CAN_MODIFY.includes(session.user.role as UserRole)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { justification, action, ...input } = body

  if (!justification) {
    return NextResponse.json(
      { message: 'Justification is required' },
      { status: 400 }
    )
  }

  try {
    // Handle different actions
    if (action === 'deactivate') {
      await deactivatePerson(params.id, justification, session.user.id)
      return NextResponse.json({ message: 'Person deactivated successfully' })
    }

    if (action === 'reset-password') {
      const tempPassword = await resetPersonPassword(
        params.id,
        justification,
        session.user.id
      )
      return NextResponse.json({
        message:     'Password reset successfully',
        tempPassword, // shown once to the admin
      })
    }

    // Default — update person details
    const person = await updatePerson(
      params.id,
      input,
      justification,
      session.user.id
    )
    return NextResponse.json({ person })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Operation failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}