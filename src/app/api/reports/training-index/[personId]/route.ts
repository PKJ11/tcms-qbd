import { NextRequest, NextResponse }   from 'next/server'
import { getSession }                  from '@/lib/auth'
import {
  getTrainingIndex,
  getSubordinateIds,
  convertToCSV,
} from '@/modules/reports'

export async function GET(
  req: NextRequest,
  { params }: { params: { personId: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const isOrgWide    = ['TRAINING_HEAD', 'ADMINISTRATOR', 'REVIEWER'].includes(session.user.role)
  const isSubManager = ['MANAGER', 'TRAINER'].includes(session.user.role)

  // Users can only view their own training index
  if (!isOrgWide && !isSubManager) {
    if (params.personId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }
  }

  // MANAGER/TRAINER can only view their subordinates
  if (isSubManager && params.personId !== session.user.id) {
    const subordinateIds = await getSubordinateIds(session.user.id)
    if (!subordinateIds.includes(params.personId)) {
      return NextResponse.json({ message: 'Forbidden — not your subordinate' }, { status: 403 })
    }
  }

  const { searchParams } = new URL(req.url)
  const format           = searchParams.get('format')
  const entries          = await getTrainingIndex(params.personId)

  if (format === 'csv') {
    const headers = [
      'Topic', 'Trigger', 'Status', 'Assigned date',
      'Due date', 'Completed date', 'Score', 'Outcome', 'Assigned by',
    ]
    const rows = entries.map((e) => [
      e.topicName,
      e.trigger,
      e.status,
      e.assignedAt.toLocaleDateString('en-IN'),
      e.dueDate.toLocaleDateString('en-IN'),
      e.completedAt?.toLocaleDateString('en-IN') ?? '',
      e.score?.toString() ?? '',
      e.outcome           ?? '',
      e.assignedBy,
    ])

    const csv = convertToCSV(headers, rows)
    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': `attachment; filename="training-index-${params.personId}.csv"`,
      },
    })
  }

  return NextResponse.json({ entries })
}