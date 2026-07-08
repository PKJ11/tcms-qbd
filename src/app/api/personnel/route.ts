import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getPersons, createPerson } from '@/modules/personnel'
import type { UserRole } from '@/lib/types'

const CAN_CREATE: UserRole[] = ['TRAINING_HEAD', 'ADMINISTRATOR']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)

  // Managers can only see their unit
  const unitId = session.user.role === 'MANAGER'
    ? session.user.unitId
    : searchParams.get('unitId') ?? undefined

  const persons = await getPersons({
    unitId,
    departmentId: searchParams.get('departmentId') ?? undefined,
    role:         searchParams.get('role')         ?? undefined,
    isActive:     searchParams.get('isActive') === 'false' ? false : true,
    search:       searchParams.get('search')       ?? undefined,
  })

  return NextResponse.json({ persons })
}

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  if (!CAN_CREATE.includes(session.user.role as UserRole)) {
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
    const result = await createPerson(input, justification, session.user.id)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create person'
    return NextResponse.json({ message }, { status: 400 })
  }
}