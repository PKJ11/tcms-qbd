import { NextRequest, NextResponse }   from 'next/server'
import { getSession }                  from '@/lib/auth'
import {
  getTrainingIndex,
  convertToCSV,
} from '@/modules/reports'
import { hasAnyRole } from '@/lib/permissions'
import { isInTeam, REPORT_OVERSIGHT_ROLES } from '@/lib/subordinates'
import { prisma }        from '@/lib/prisma'
import { formatDate }    from '@/lib/utils'
import { TrainingIndexPdf } from '@/modules/reports/pdf/TrainingIndexPdf'
import { renderReportPdf }  from '@/modules/reports/pdf/render'

export async function GET(
  req: NextRequest,
  { params }: { params: { personId: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const isOversight = hasAnyRole(session.user, REPORT_OVERSIGHT_ROLES)
  const isSelf       = params.personId === session.user.id
  const isOwnTeam    = !isOversight && !isSelf && await isInTeam(session.user.id, params.personId)

  // Non-oversight users can only view their own index or someone in their reporting chain
  if (!isOversight && !isSelf && !isOwnTeam) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
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

  if (format === 'pdf') {
    const [person, preparer] = await Promise.all([
      prisma.person.findUnique({
        where:  { id: params.personId },
        select: {
          name: true, employeeId: true, designation: true,
          department: { select: { name: true } },
          manager:    { select: { name: true, designation: true } },
        },
      }),
      prisma.person.findUnique({
        where:  { id: session.user.id },
        select: { designation: true },
      }),
    ])

    const today = formatDate(new Date())

    const buffer = await renderReportPdf(
      TrainingIndexPdf({
        entries,
        personName:        person?.name ?? '—',
        personEmployeeId:  person?.employeeId ?? '—',
        personDesignation: person?.designation ?? '—',
        personDepartment:  person?.department?.name ?? '—',
        preparedByName:    session.user.name,
        preparedByTitle:   preparer?.designation ?? '—',
        preparedDate:      today,
        // Reviewed By / Approved By are always the employee's manager —
        // that reporting-line sign-off is what makes this a controlled record.
        reviewedByName:    person?.manager?.name       ?? '—',
        reviewedByTitle:   person?.manager?.designation ?? '—',
      })
    )
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="training-index-${params.personId}.pdf"`,
      },
    })
  }

  return NextResponse.json({ entries })
}