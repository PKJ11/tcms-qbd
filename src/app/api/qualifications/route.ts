import { NextRequest, NextResponse } from 'next/server'
import { getSession }     from '@/lib/auth'
import {
  getQualifications,
  createQualification,
} from '@/modules/qualification'
import { getSubordinateIds, isSubordinate } from '@/lib/subordinates'
import type { UserRole }  from '@/lib/types'

const CAN_CREATE: UserRole[] = ['TRAINING_HEAD', 'SUPER_ADMIN']
const CAN_MANAGE: UserRole[] = ['TRAINER', 'TRAINING_HEAD', 'SUPER_ADMIN']
const SUB_SCOPE:  UserRole[] = ['MANAGER', 'TRAINER']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const isOrgWide        = ['TRAINING_HEAD', 'SUPER_ADMIN', 'MD'].includes(session.user.role)
  const isSubScope       = SUB_SCOPE.includes(session.user.role)

  let subordinateIds: string[] | undefined

  if (session.user.role === 'USER') {
    // Regular users see only their own qualifications
    const qualifications = await getQualifications({
      personId: session.user.id,
    })
    return NextResponse.json({ qualifications })
  }

  if (isSubScope) {
    // MANAGER and TRAINER see their direct reports only
    subordinateIds = await getSubordinateIds(session.user.id)

    if (subordinateIds.length === 0) {
      return NextResponse.json({ qualifications: [] })
    }
  }

  const qualifications = await getQualifications({
    personId:       isOrgWide
      ? (searchParams.get('personId') ?? undefined)
      : undefined,
    techniqueId:    searchParams.get('techniqueId') ?? undefined,
    status:         searchParams.get('status')      ?? undefined,
    subordinateIds: subordinateIds,
  })

  return NextResponse.json({ qualifications })
}

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!CAN_CREATE.includes(session.user.role)) {
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
    const qualification = await createQualification(
      input,
      justification,
      session.user.id
    )
    return NextResponse.json({ qualification }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create qualification'
    return NextResponse.json({ message }, { status: 400 })
  }
}