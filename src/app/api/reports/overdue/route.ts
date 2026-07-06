import { NextRequest, NextResponse } from 'next/server'
import { getSession }          from '@/lib/auth'
import { getOverdueReport, convertToCSV } from '@/modules/reports'
import type { UserRole }       from '@/lib/types'

const CAN_VIEW: UserRole[] = ['MANAGER', 'TRAINING_HEAD', 'SUPER_ADMIN', 'MD']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!CAN_VIEW.includes(session.user.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format')

  const rows = await getOverdueReport({
    unitId:       session.user.role === 'MANAGER'
      ? session.user.unitId
      : searchParams.get('unitId') ?? undefined,
    departmentId: searchParams.get('departmentId') ?? undefined,
  })

  if (format === 'csv') {
    const headers = ['Employee ID', 'Name', 'Department', 'Unit', 'Manager', 'Topic', 'Trigger', 'Due date', 'Days overdue']
    const csvRows = rows.map((r) => [
      r.person.employeeId,
      r.person.name,
      r.person.department ?? '',
      r.person.unit,
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

  return NextResponse.json({ rows })
}