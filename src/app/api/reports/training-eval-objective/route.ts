import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTopicsForReport, getTrainingEvalObjective } from '@/modules/reports'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'
import { formatDate } from '@/lib/utils'
import { TrainingEvalObjectivePdf } from '@/modules/reports/pdf/TrainingEvalObjectivePdf'
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
  const topicId = searchParams.get('topicId')
  const format  = searchParams.get('format')

  // No topic → the picker's bootstrap call: return the topic list.
  if (!topicId) {
    const topics = await getTopicsForReport()
    return NextResponse.json({ topics })
  }

  const data = await getTrainingEvalObjective(topicId)
  if (!data) {
    return NextResponse.json({ message: 'Topic not found' }, { status: 404 })
  }

  if (format === 'pdf') {
    const buffer = await renderReportPdf(
      TrainingEvalObjectivePdf({
        data,
        preparedByName: session.user.name,
        preparedDate:   formatDate(new Date()),
      })
    )
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="training-evaluation-objective-${data.topicName}.pdf"`,
      },
    })
  }

  return NextResponse.json({ data })
}
