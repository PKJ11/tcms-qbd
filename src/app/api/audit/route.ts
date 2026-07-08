import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { UserRole } from '@/lib/types'

// Only Training Head and above can read audit logs
const ALLOWED_ROLES: UserRole[] = [
  'TRAINING_HEAD',
  'SUPER_ADMIN',
  'MD',
]

export async function GET(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  if (!ALLOWED_ROLES.includes(session.user.role as UserRole)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)

  const page      = parseInt(searchParams.get('page')   ?? '1')
  const limit     = parseInt(searchParams.get('limit')  ?? '50')
  const module    = searchParams.get('module')    ?? undefined
  const action    = searchParams.get('action')    ?? undefined
  const personId  = searchParams.get('personId')  ?? undefined
  const search    = searchParams.get('search')    ?? undefined
  const dateFrom  = searchParams.get('dateFrom')  ?? undefined
  const dateTo    = searchParams.get('dateTo')    ?? undefined

  const skip = (page - 1) * limit

  // Build dynamic where clause
  const where: Record<string, unknown> = {}
  if (module)   where.module   = module
  if (action)   where.action   = action
  if (personId) where.userId   = personId
  if (search) {
    where.justification = { contains: search, mode: 'insensitive' }
  }
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo   ? { lte: new Date(dateTo)   } : {}),
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id:         true,
            name:       true,
            email:      true,
            employeeId: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

// Explicitly block all write methods
export async function POST() {
  return NextResponse.json(
    { message: 'Audit trail is read-only' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { message: 'Audit trail is read-only' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { message: 'Audit trail is read-only' },
    { status: 405 }
  )
}