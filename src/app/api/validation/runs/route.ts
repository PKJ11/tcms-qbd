import { NextRequest, NextResponse } from 'next/server'
import { getSession }           from '@/lib/auth'
import { getValidationRuns, createValidationRun } from '@/modules/validation'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_USERS)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

  const runs = await getValidationRuns()
  return NextResponse.json({ runs })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_USERS)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  try {
    const run = await createValidationRun(body, session.user.id)
    return NextResponse.json({ run }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}