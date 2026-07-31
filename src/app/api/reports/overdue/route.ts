import { NextRequest, NextResponse }   from 'next/server'
import { getSession }                  from '@/lib/auth'
import {
  getOverdueReport,
  convertToCSV,
} from '@/modules/reports'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'
import { resolveScopeFilter }      from '@/lib/subordinates'
import { formatDate }              from '@/lib/utils'
import { OverdueReportPdf }        from '@/modules/reports/pdf/OverdueReportPdf'
import { renderReportPdf }         from '@/modules/reports/pdf/render'

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

  const rows = await getOverdueReport({
    departmentId: searchParams.get('departmentId') ?? undefined,
    unitId:       searchParams.get('unitId')       ?? undefined,
    sectionId:    searchParams.get('sectionId')    ?? undefined,
    subordinateIds,
  })

  if (format === 'csv') {
    const headers = [
      'Employee ID', 'Name', 'Department', 'Section',
      'Manager', 'Topic', 'Trigger', 'Due date', 'Days overdue',
    ]
    const csvRows = rows.map((r) => [
      r.person.employeeId,
      r.person.name,
      r.person.department ?? '',
      r.person.section    ?? '',
      r.person.manager    ?? '',
      r.assignment.topicName,
      r.assignment.trigger,
      r.assignment.dueDate.toLocaleDateString('en-IN'),
      r.assignment.daysOverdue.toString(),
    ])

    const csv = convertToCSV(headers, csvRows)
    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': 'attachment; filename="overdue-report.csv"',
      },
    })
  }

  if (format === 'pdf') {
    const buffer = await renderReportPdf(
      OverdueReportPdf({
        rows,
        preparedByName: session.user.name,
        preparedDate:   formatDate(new Date()),
      })
    )
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'attachment; filename="overdue-report.pdf"',
      },
    })
  }

  return NextResponse.json({ rows })
}