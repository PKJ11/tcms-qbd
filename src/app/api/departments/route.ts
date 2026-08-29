import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createDepartment, deleteDepartment } from '@/modules/organization'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

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
      code: true,
      _count: { select: { persons: { where: { isActive: true } } } },
      units: {
        where:  { isActive: true },
        select: {
          id:   true,
          name: true,
          _count: { select: { persons: { where: { isActive: true } } } },
          sections: {
            where:   { isActive: true },
            select: {
              id: true, name: true, code: true,
              _count: { select: { persons: { where: { isActive: true } } } },
            },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ departments })
}

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_ORG)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { justification, password, ...input } = body

  if (!justification) {
    return NextResponse.json({ message: 'Justification is required' }, { status: 400 })
  }
  if (!password) {
    return NextResponse.json({ message: 'Password is required' }, { status: 400 })
  }

  try {
    const department = await createDepartment(input, justification, session.user.id, password)
    return NextResponse.json({ department }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create department'
    return NextResponse.json({ message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_ORG)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { id, justification, password } = body

  if (!id) {
    return NextResponse.json({ message: 'Department id is required' }, { status: 400 })
  }
  if (!justification) {
    return NextResponse.json({ message: 'Justification is required' }, { status: 400 })
  }
  if (!password) {
    return NextResponse.json({ message: 'Password is required' }, { status: 400 })
  }

  try {
    const result = await deleteDepartment(id, justification, session.user.id, password)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete department'
    return NextResponse.json({ message }, { status: 400 })
  }
}
