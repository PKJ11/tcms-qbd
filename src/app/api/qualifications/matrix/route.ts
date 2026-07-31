import { NextRequest, NextResponse }   from 'next/server'
import { getSession }                  from '@/lib/auth'
import { getCompetencyMatrix }         from '@/modules/qualification'
import { PERMISSIONS, hasAnyRole }     from '@/lib/permissions'
import { formatDate }                  from '@/lib/utils'
import { CompetencyMatrixPdf }         from '@/modules/reports/pdf/CompetencyMatrixPdf'
import { renderReportPdf }             from '@/modules/reports/pdf/render'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.VIEW_QUALIFICATIONS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format')

  const matrix = await getCompetencyMatrix({
    departmentId: searchParams.get('departmentId') ?? undefined,
  })

  if (format === 'pdf') {
    const buffer = await renderReportPdf(
      CompetencyMatrixPdf({
        persons:    matrix.persons,
        techniques: matrix.techniques,
        preparedByName: session.user.name,
        preparedDate:   formatDate(new Date()),
      })
    )
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'attachment; filename="competency-matrix.pdf"',
      },
    })
  }

  return NextResponse.json(matrix)
}