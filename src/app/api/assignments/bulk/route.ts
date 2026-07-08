import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { bulkAssignByDepartment } from '@/modules/assignments'
import type { UserRole } from '@/lib/types'

const CAN_ASSIGN: UserRole[] = ['TRAINING_HEAD', 'SUPER_ADMIN']

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  if (!CAN_ASSIGN.includes(session.user.role as UserRole)) {
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
    const result = await bulkAssignByDepartment(input, justification, session.user.id)
    return NextResponse.json({ result }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bulk assignment failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}