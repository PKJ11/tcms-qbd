import { NextRequest, NextResponse }   from 'next/server'
import { getSession }                  from '@/lib/auth'
import {
  getTrainingMatrix,
  convertToCSV,
} from '@/modules/reports'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'
import { resolveScopeFilter }      from '@/lib/subordinates'
import { formatDate }              from '@/lib/utils'
import { TrainingMatrixPdf }       from '@/modules/reports/pdf/TrainingMatrixPdf'
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
  const isOrgWide        = subordinateIds === undefined
  const departmentId     = searchParams.get('departmentId') ?? undefined
  const fromParam        = searchParams.get('from')
  const toParam          = searchParams.get('to')

  // The matrix always needs a time period — and, for org-wide viewers who
  // aren't already scoped to a fixed team, a department too.
  const missingFilters = !fromParam || !toParam || (isOrgWide && !departmentId)

  if (missingFilters) {
    if (format === 'csv' || format === 'pdf') {
      return NextResponse.json(
        { message: 'Select a time period (and department, for org-wide data) before exporting' },
        { status: 400 }
      )
    }
    return NextResponse.json({ matrix: [], needsFilters: true })
  }

  const matrix = await getTrainingMatrix({
    departmentId,
    unitId:    searchParams.get('unitId')    ?? undefined,
    sectionId: searchParams.get('sectionId') ?? undefined,
    subordinateIds,
    fromDate: new Date(fromParam!),
    toDate:   new Date(`${toParam}T23:59:59.999`),
  })

  if (format === 'csv') {
    if (matrix.length === 0) return new NextResponse('No data', { status: 200 })

    const topicNames = matrix[0]?.topics.map((t) => t.topicName) ?? []
    const headers    = ['Employee ID', 'Name', 'Department', ...topicNames]
    const rows       = matrix.map((row) => [
      row.person.employeeId,
      row.person.name,
      row.person.department?.name ?? '',

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

  if (format === 'pdf') {
    // "Jul-26" style label — matching the physical form's per-month title.
    // Falls back to a "Jul-26 to Aug-26" range if the chosen period spans
    // more than one calendar month.
    const monthYear = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).replace(' ', '-')
    const fromLabel = monthYear(new Date(fromParam!))
    const toLabel   = monthYear(new Date(toParam!))
    const periodLabel = fromLabel === toLabel ? fromLabel : `${fromLabel} to ${toLabel}`

    const buffer = await renderReportPdf(
      TrainingMatrixPdf({
        matrix,
        preparedByName: session.user.name,
        preparedDate:   formatDate(new Date()),
        periodLabel,
      })
    )
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'attachment; filename="training-matrix.pdf"',
      },
    })
  }

  return NextResponse.json({ matrix })
}
