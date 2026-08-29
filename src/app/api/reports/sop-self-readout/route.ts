import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSopSelfReadoutList, convertToCSV } from '@/modules/reports'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'
import { resolveScopeFilter } from '@/lib/subordinates'
import { formatDate } from '@/lib/utils'
import { SopSelfReadoutPdf } from '@/modules/reports/pdf/SopSelfReadoutPdf'
import { renderReportPdf } from '@/modules/reports/pdf/render'

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
  const subordinateIds = await resolveScopeFilter(session.user, searchParams.get('scope'))

  const data = await getSopSelfReadoutList({ subordinateIds })

  if (format === 'csv') {
    const headers = ['Sr. No.', 'SOP No.', 'Title', 'Revision No.', 'SOP read on (Date)', 'Emp. Name', 'Date of Trainee']
    const rows    = data.rows.map((r, i) => [
      String(i + 1),
      r.sopNo,
      r.title,
      r.revisionNo,
      r.readOn ? formatDate(r.readOn) : '—',
      r.empName,
      r.completedAt ? formatDate(r.completedAt) : 'N/A',
    ])
    const csv = convertToCSV(headers, rows)
    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': 'attachment; filename="list-of-sops-self-readout.csv"',
      },
    })
  }

  if (format === 'pdf') {
    const buffer = await renderReportPdf(
      SopSelfReadoutPdf({
        rows:           data.rows,
        preparedByName: session.user.name,
        preparedDate:   formatDate(new Date()),
      })
    )
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'attachment; filename="list-of-sops-self-readout.pdf"',
      },
    })
  }

  return NextResponse.json({ rows: data.rows })
}
