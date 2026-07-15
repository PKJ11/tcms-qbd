import { NextRequest, NextResponse }   from 'next/server'
import { getSession }                  from '@/lib/auth'
import {
  getQualificationStatusBoard,
  convertToCSV,
} from '@/modules/reports'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'
import { resolveScopeFilter }      from '@/lib/subordinates'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.VIEW_REPORTS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const format           = searchParams.get('format')
  const subordinateIds   = await resolveScopeFilter(session.user, searchParams.get('scope'))

  const rows = await getQualificationStatusBoard({
    departmentId: searchParams.get('departmentId') ?? undefined,
    unitId:       searchParams.get('unitId')       ?? undefined,
    sectionId:    searchParams.get('sectionId')    ?? undefined,
    status:       searchParams.get('status') ?? undefined,
    subordinateIds,
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