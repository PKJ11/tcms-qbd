import { NextRequest, NextResponse }   from 'next/server'
import { getSession }                  from '@/lib/auth'
import { getCompetencyMatrix }         from '@/modules/qualification'
import { getSubordinateIds }           from '@/lib/subordinates'
import type { UserRole }               from '@/lib/types'

const CAN_VIEW: UserRole[] = ['MANAGER', 'TRAINER', 'TRAINING_HEAD', 'ADMINISTRATOR', 'REVIEWER']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!CAN_VIEW.includes(session.user.role as UserRole)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const isOrgWide        = ['TRAINING_HEAD', 'ADMINISTRATOR', 'REVIEWER'].includes(session.user.role as UserRole)
  const isSubScope       = ['MANAGER', 'TRAINER'].includes(session.user.role as UserRole)

  let subordinateIds: string[] | undefined

  if (isSubScope) {
    subordinateIds = await getSubordinateIds(session.user.id)
    if (subordinateIds.length === 0) {
      return NextResponse.json({ persons: [], techniques: [] })
    }
  }

  const matrix = await getCompetencyMatrix({
    departmentId:   isOrgWide ? (searchParams.get('departmentId') ?? undefined) : undefined,
    subordinateIds: subordinateIds,
  })

  return NextResponse.json(matrix)
}