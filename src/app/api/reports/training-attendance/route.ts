import { NextRequest, NextResponse } from 'next/server'
import { getSession }                from '@/lib/auth'
import { getTrainingAttendanceRecord, convertToCSV } from '@/modules/reports'
import { PERMISSIONS, hasAnyRole }   from '@/lib/permissions'
import { resolveScopeFilter }        from '@/lib/subordinates'
import { formatDate }                from '@/lib/utils'
import { TrainingAttendancePdf }     from '@/modules/reports/pdf/TrainingAttendancePdf'
import { renderReportPdf }           from '@/modules/reports/pdf/render'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.VIEW_REPORTS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const format         = searchParams.get('format')
  const topicId        = searchParams.get('topicId')
  const dateParam       = searchParams.get('date')
  const subordinateIds  = await resolveScopeFilter(session.user, searchParams.get('scope'))

  if (!topicId || !dateParam) {
    if (format === 'csv' || format === 'pdf') {
      return NextResponse.json({ message: 'Select a training topic and date first' }, { status: 400 })
    }
    return NextResponse.json({ record: null, needsFilters: true })
  }

  let record
  try {
    record = await getTrainingAttendanceRecord({
      topicId,
      date: dateParam,
      subordinateIds,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build attendance record'
    return NextResponse.json({ message }, { status: 400 })
  }

  if (format === 'csv') {
    const headers = ['Sr. No', 'Name of Trainee', 'Department']
    const rows    = record.attendees.map((a, i) => [String(i + 1), a.name, a.department ?? ''])
    const csv     = convertToCSV(headers, rows)
    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': 'attachment; filename="training-attendance.csv"',
      },
    })
  }

  if (format === 'pdf') {
    const buffer = await renderReportPdf(
      TrainingAttendancePdf({
        record,
        dateLabel: formatDate(record.date),
      })
    )
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'attachment; filename="training-attendance.pdf"',
      },
    })
  }

  return NextResponse.json({ record })
}
