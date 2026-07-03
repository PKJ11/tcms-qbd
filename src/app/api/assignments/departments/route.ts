import { NextResponse } from 'next/server'
import { getSession }   from '@/lib/auth'
import { prisma }       from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const departments = await prisma.department.findMany({
    where:   { isActive: true },
    select: {
      id:   true,
      name: true,
      unit: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ departments })
}