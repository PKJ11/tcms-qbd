import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getPersons, createPerson } from '@/modules/personnel'
import { getSubordinateIds, REPORT_OVERSIGHT_ROLES } from '@/lib/subordinates'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)

  // Report screens with org-wide ("All data") access pass scope=all to list
  // every active person for their picker — only honoured for roles that
  // already have REPORT_OVERSIGHT_ROLES org-wide report access.
  const reportsAllScope = searchParams.get('scope') === 'all'
    && hasAnyRole(session.user, REPORT_OVERSIGHT_ROLES)

  // A Trainer/Guest Trainer without VIEW_PERSONNEL only sees their own direct/indirect reports
  const isScoped = hasAnyRole(session.user, ['TRAINER', 'GUEST_TRAINER'])
    && !hasAnyRole(session.user, [...PERMISSIONS.VIEW_PERSONNEL])
    && !reportsAllScope
  const subordinateIds = isScoped
    ? await getSubordinateIds(session.user.id)
    : undefined

  const persons = await getPersons({
    subordinateIds,
    departmentId: searchParams.get('departmentId') ?? undefined,
    unitId:       searchParams.get('unitId')        ?? undefined,
    sectionId:    searchParams.get('sectionId')     ?? undefined,
    role:         searchParams.get('role')          ?? undefined,
    isActive:     searchParams.get('isActive') === 'false' ? false : true,
    search:       searchParams.get('search')        ?? undefined,
  })

  return NextResponse.json({ persons })
}

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_USERS)) {
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