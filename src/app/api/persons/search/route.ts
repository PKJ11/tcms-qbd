import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

// Same access level as the audit trail — this endpoint exists to power
// the personnel filter on that screen.

export async function GET(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  if (!hasAnyRole(session.user, PERMISSIONS.VIEW_AUDIT_TRAIL)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()

  if (!q) {
    return NextResponse.json({ persons: [] })
  }

  const persons = await prisma.person.findMany({
    where: {
      OR: [
        { name:       { contains: q, mode: 'insensitive' } },
        { employeeId: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id:         true,
      name:       true,
      employeeId: true,
    },
    orderBy: { name: 'asc' },
    take: 15,
  })

  return NextResponse.json({ persons })
}

// Explicitly block all write methods
export async function POST() {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { status: 405 }
  )
}