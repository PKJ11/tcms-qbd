import { NextRequest, NextResponse } from 'next/server'
import { getSession }     from '@/lib/auth'
import {
  getQualifications,
  createQualification,
} from '@/modules/qualification'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const isOrgWide = hasAnyRole(session.user, [...PERMISSIONS.VIEW_QUALIFICATIONS])

  if (!isOrgWide) {
    // Non-elevated users (e.g. Trainee) see only their own qualifications
    const qualifications = await getQualifications({
      personId: session.user.id,
    })
    return NextResponse.json({ qualifications })
  }

  const qualifications = await getQualifications({
    personId:    searchParams.get('personId')    ?? undefined,
    techniqueId: searchParams.get('techniqueId') ?? undefined,
    status:      searchParams.get('status')      ?? undefined,
  })

  return NextResponse.json({ qualifications })
}

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_QUALIFICATIONS)) {
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