import { NextResponse } from 'next/server'
import { getSession }   from '@/lib/auth'
import { prisma }       from '@/lib/prisma'
import type { UserRole } from '@/lib/types'

const CAN_VIEW: UserRole[] = ['TRAINING_HEAD', 'SUPER_ADMIN']

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!CAN_VIEW.includes(session.user.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const persons = await prisma.person.findMany({
    where: { flaggedForJobReassignment: true },
    select: {
      id:          true,
      name:        true,
      employeeId:  true,
      designation: true,
      flaggedAt:   true,
      flagReason:  true,
      department:  { select: { name: true } },
    },
    orderBy: { flaggedAt: 'desc' },
  })

  return NextResponse.json({ persons })
}