import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTopicsForReport, getTopicCompletionReport, convertToCSV } from '@/modules/reports'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'
import { resolveScopeFilter } from '@/lib/subordinates'

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

  if (!topicId) {
    const topics = await getTopicsForReport()
    return NextResponse.json({ topics })
  }

  const scope = searchParams.get('scope')

  // "mine" is a 4th view — everyone *this* user personally assigned the
  // topic to, regardless of reporting hierarchy — distinct from the
  // all/team/reportees person-scoped views resolved below.
  const report = scope === 'mine'
    ? await getTopicCompletionReport(topicId, { assignedById: session.user.id })
    : await getTopicCompletionReport(topicId, { subordinateIds: await resolveScopeFilter(session.user, scope) })

  if (!report) {
    return NextResponse.json({ message: 'Topic not found' }, { status: 404 })
  }

  if (format === 'csv') {
    const headers = ['Topic', 'Employee ID', 'Trainee', 'Status', 'Assigned', 'Due', 'Completed', 'Assigned by']
    const rows = report.trainees.map((t) => [
      report.topicName,
      t.employeeId,
      t.name,
      t.status,
      t.assignedAt.toLocaleDateString('en-IN'),
      t.dueDate.toLocaleDateString('en-IN'),
      t.completedAt?.toLocaleDateString('en-IN') ?? '',
      t.assignedBy,
    ])
    const csv = convertToCSV(headers, rows)
    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': `attachment; filename="topic-completion-${report.topicName}.csv"`,
      },
    })
  }

  return NextResponse.json({ report })
}
