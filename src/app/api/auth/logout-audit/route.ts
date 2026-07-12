// app/api/auth/logout-audit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'   // wherever authOptions lives
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const type: 'manual' | 'auto' = body?.type === 'auto' ? 'auto' : 'manual'

    const justification =
      type === 'auto'
        ? 'Logout: Automated — session expired after period of inactivity'
        : 'Logout: User-initiated — user clicked sign out'

    await prisma.auditLog.create({
      data: {
        userId:     session.user.id,
        action:     'LOGOUT',
        module:     'AUTH',
        recordId:   session.user.id,
        recordType: 'Person',
        justification,
        afterValue: {
          employeeId: session.user.employeeId,
          roles:      session.user.roles,
          logoutType: type,
          timestamp:  new Date().toISOString(),
        },
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[LOGOUT AUDIT ERROR]', error)
    return NextResponse.json({ ok: false }) // never block logout
  }
}