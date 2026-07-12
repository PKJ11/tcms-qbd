import { NextRequest, NextResponse }   from 'next/server'
import { getSession }                  from '@/lib/auth'
import {
  getTrainingMatrix,
  convertToCSV,
} from '@/modules/reports'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

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

  const matrix = await getTrainingMatrix({
    departmentId: searchParams.get('departmentId') ?? undefined,
    topicId:      searchParams.get('topicId') ?? undefined,
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

  return NextResponse.json({ matrix })
}