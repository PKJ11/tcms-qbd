import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  getTrainerCertificates,
  issueTrainerCertificate,
  getEligibleTrainers,
} from '@/modules/trainer-cert'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const [certificates, eligible] = await Promise.all([
    getTrainerCertificates(),
    hasAnyRole(session.user, PERMISSIONS.MANAGE_QUALIFICATIONS) ? getEligibleTrainers() : Promise.resolve([]),
  ])

  return NextResponse.json({ certificates, eligible })
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
    const cert = await issueTrainerCertificate(input, justification, session.user.id)
    return NextResponse.json({ cert }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to issue certificate'
    return NextResponse.json({ message }, { status: 400 })
  }
}