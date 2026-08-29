import { NextResponse } from 'next/server'
import { getSession }   from '@/lib/auth'
import { getTrainersList, convertToCSV } from '@/modules/reports'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'
import { formatDate } from '@/lib/utils'
import { TrainersListPdf } from '@/modules/reports/pdf/TrainersListPdf'
import { renderReportPdf } from '@/modules/reports/pdf/render'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.VIEW_REPORTS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const format  = searchParams.get('format')
  const trainers = await getTrainersList()

  if (format === 'csv') {
    const headers = ['Sr. No.', 'Name of Trainer', 'Designation', 'Department']
    const rows    = trainers.map((t, i) => [String(i + 1), t.name, t.designation ?? '', t.department ?? ''])
    const csv     = convertToCSV(headers, rows)
    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': 'attachment; filename="list-of-trainers.csv"',
      },
    })
  }

  if (format === 'pdf') {
    const buffer = await renderReportPdf(
      TrainersListPdf({
        trainers,
        preparedByName: session.user.name,
        preparedDate:   formatDate(new Date()),
      })
    )
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'attachment; filename="list-of-trainers.pdf"',
      },
    })
  }

  return NextResponse.json({ trainers })
}
