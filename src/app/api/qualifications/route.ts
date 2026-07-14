import { NextRequest, NextResponse } from 'next/server'
import { getSession }     from '@/lib/auth'
import {
  getQualifications,
  createQualification,
} from '@/modules/qualification'
import { canManageQualifications } from '@/lib/permissions'
import { getSubordinateIds, getTeamIds } from '@/lib/subordinates'

// Every authenticated user can browse every qualification record — the
// "scope" query param just narrows which slice they're looking at, it is
// not an access-control gate. Valid values:
//   relevant   (default) — about me, created by me, or supervised by me
//   mine       — I am the analyst being qualified
//   created    — I initiated the record
//   supervised — I am recorded as the supervisor
//   reportees  — the analyst is one of my direct reports
//   team       — the analyst is anywhere under me in the reporting chain
//   all        — every record, org-wide
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const scope  = searchParams.get('scope') ?? 'relevant'
  const userId = session.user.id

  const baseFilters = {
    techniqueId: searchParams.get('techniqueId') ?? undefined,
    status:      searchParams.get('status')      ?? undefined,
  }

  let qualifications
  switch (scope) {
    case 'all':
      qualifications = await getQualifications(baseFilters)
      break
    case 'mine':
      qualifications = await getQualifications({ ...baseFilters, personId: userId })
      break
    case 'created':
      qualifications = await getQualifications({ ...baseFilters, initiatedById: userId })
      break
    case 'supervised':
      qualifications = await getQualifications({ ...baseFilters, supervisorId: userId })
      break
    case 'reportees':
      qualifications = await getQualifications({
        ...baseFilters,
        subordinateIds: await getSubordinateIds(userId),
      })
      break
    case 'team':
      qualifications = await getQualifications({
        ...baseFilters,
        subordinateIds: await getTeamIds(userId),
      })
      break
    case 'relevant':
    default:
      qualifications = await getQualifications({ ...baseFilters, relevantToId: userId })
      break
  }

  return NextResponse.json({ qualifications })
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