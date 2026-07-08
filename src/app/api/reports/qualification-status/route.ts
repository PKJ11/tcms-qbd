import { NextRequest, NextResponse }   from 'next/server'
import { getSession }                  from '@/lib/auth'
import {
  getQualificationStatusBoard,
  getSubordinateIds,
  convertToCSV,
} from '@/modules/reports'
import type { UserRole } from '@/lib/types'

// Now includes MANAGER and TRAINER
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
  const format           = searchParams.get('format')
  const isOrgWide        = ['TRAINING_HEAD', 'ADMINISTRATOR', 'REVIEWER'].includes(session.user.role)

  let subordinateIds: string[] | undefined

  if (!isOrgWide) {
    subordinateIds = await getSubordinateIds(session.user.id)
    if (subordinateIds.length === 0) {
      return NextResponse.json({ rows: [] })
    }
  }

  const rows = await getQualificationStatusBoard({
    departmentId:   isOrgWide ? (searchParams.get('departmentId') ?? undefined) : undefined,
    status:         searchParams.get('status') ?? undefined,
    subordinateIds: subordinateIds,
  })

  if (format === 'csv') {
    const headers = [
      'Employee ID', 'Name', 'Department', 'Technique',
      'Status', 'Outcome', 'Approved date', 'Expiry date',
      'Days to expiry', 'Certificate no.',
    ]
    const csvRows = rows.map((r) => [
      r.person.employeeId,
      r.person.name,
      r.person.department ?? '',
      r.technique,
      r.status,
      r.outcome          ?? '',
      r.approvedAt?.toLocaleDateString('en-IN') ?? '',
      r.expiryDate?.toLocaleDateString('en-IN') ?? '',
      r.daysToExpiry?.toString() ?? '',
      r.certNumber ?? '',
    ])

    const csv = convertToCSV(headers, csvRows)
    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': 'attachment; filename="qualification-status.csv"',
      },
    })
  }

  return NextResponse.json({ rows })
}