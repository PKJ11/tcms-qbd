import { NextRequest, NextResponse }   from 'next/server'
import { getSession }                  from '@/lib/auth'
import {
  getTrainingMatrix,
  getSubordinateIds,
  convertToCSV,
} from '@/modules/reports'
import type { UserRole } from '@/lib/types'

const CAN_VIEW: UserRole[] = ['MANAGER', 'TRAINER', 'TRAINING_HEAD', 'SUPER_ADMIN', 'MD']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!CAN_VIEW.includes(session.user.role as UserRole)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const format           = searchParams.get('format')

  // Determine scope
  const isOrgWide = ['TRAINING_HEAD', 'SUPER_ADMIN', 'MD'].includes(session.user.role)

  let subordinateIds: string[] | undefined

  if (!isOrgWide) {
    // MANAGER or TRAINER — scope to their direct reports only
    subordinateIds = await getSubordinateIds(session.user.id)

    if (subordinateIds.length === 0) {
      return NextResponse.json({ matrix: [] })
    }
  }

  const matrix = await getTrainingMatrix({
    unitId:         isOrgWide ? (searchParams.get('unitId')       ?? undefined) : undefined,
    departmentId:   isOrgWide ? (searchParams.get('departmentId') ?? undefined) : undefined,
    topicId:        searchParams.get('topicId') ?? undefined,
    subordinateIds: subordinateIds,
  })

  if (format === 'csv') {
    if (matrix.length === 0) return new NextResponse('No data', { status: 200 })

    const topicNames = matrix[0]?.topics.map((t) => t.topicName) ?? []
    const headers    = ['Employee ID', 'Name', 'Department', 'Unit', ...topicNames]
    const rows       = matrix.map((row) => [
      row.person.employeeId,
      row.person.name,
      row.person.department?.name ?? '',
      row.person.unit.name,
      ...row.topics.map((t) => t.status),
    ])

    const csv = convertToCSV(headers, rows)
    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': 'attachment; filename="training-matrix.csv"',
      },
    })
  }

  return NextResponse.json({ matrix })
}