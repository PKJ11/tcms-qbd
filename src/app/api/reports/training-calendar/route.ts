import { NextRequest, NextResponse } from 'next/server'
import { getSession }                from '@/lib/auth'
import {
  getCalendarDepartments,
  getTrainingCalendar,
  getAddableTopics,
  addTrainingCalendarTopics,
  addTrainingCalendarRow,
  renameTrainingCalendarRow,
  deleteTrainingCalendarRow,
  setTrainingCalendarMark,
  convertToCSV,
} from '@/modules/reports'
import { PERMISSIONS, hasAnyRole, hasRole } from '@/lib/permissions'
import { formatDate }              from '@/lib/utils'
import { TrainingCalendarPdf }     from '@/modules/reports/pdf/TrainingCalendarPdf'
import { renderReportPdf }         from '@/modules/reports/pdf/render'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseYear(raw: string | null): number {
  const y = Number(raw)
  return Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : new Date().getFullYear()
}

// ── GET — calendar data, or CSV / PDF export; also the department list ──
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.VIEW_REPORTS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)

  // No department → the picker's bootstrap call: return the department list.
  const departmentId = searchParams.get('departmentId')
  if (!departmentId) {
    const departments = await getCalendarDepartments()
    return NextResponse.json({ departments })
  }

  // ?addable=1 → the "Add topics" picker: every Active/Pending topic, each
  // flagged with whether it is already on this department's calendar.
  if (searchParams.get('addable')) {
    const topics = await getAddableTopics(departmentId)
    return NextResponse.json({ topics })
  }

  const year   = parseYear(searchParams.get('year'))
  const format = searchParams.get('format')
  const data   = await getTrainingCalendar({ departmentId, year })

  if (format === 'csv') {
    const headers = ['Sr. No.', 'Topic of Training', ...MONTHS]
    const rows    = data.rows.map((r, i) => [
      String(i + 1),
      r.title,
      ...r.months.map((on) => (on ? 'X' : '')),
    ])
    const csv = convertToCSV(headers, rows)
    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': `attachment; filename="training-calendar-${year}.csv"`,
      },
    })
  }

  if (format === 'pdf') {
    const buffer = await renderReportPdf(
      TrainingCalendarPdf({
        data,
        preparedByName: session.user.name,
        preparedDate:   formatDate(new Date()),
      })
    )
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="training-calendar-${year}.pdf"`,
      },
    })
  }

  return NextResponse.json({ data })
}

// ── POST — mutations. Only a Trainer may edit the calendar. ────────────
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasRole(session.user, 'TRAINER')) {
    return NextResponse.json({ message: 'Only a Trainer can edit the training calendar' }, { status: 403 })
  }

  const body   = await req.json().catch(() => null)
  const action = body?.action as string | undefined

  try {
    switch (action) {
      case 'addRow': {
        if (!body.departmentId || !body.title) {
          return NextResponse.json({ message: 'departmentId and title are required' }, { status: 400 })
        }
        const row = await addTrainingCalendarRow({
          departmentId: body.departmentId,
          title:        body.title,
          actorId:      session.user.id,
        })
        return NextResponse.json({ row }, { status: 201 })
      }

      case 'addTopics': {
        if (!body.departmentId || !Array.isArray(body.topicIds)) {
          return NextResponse.json({ message: 'departmentId and topicIds[] are required' }, { status: 400 })
        }
        const { added } = await addTrainingCalendarTopics({
          departmentId: body.departmentId,
          topicIds:     body.topicIds,
        })
        return NextResponse.json({ added }, { status: 201 })
      }

      case 'renameRow': {
        if (!body.rowId || !body.title) {
          return NextResponse.json({ message: 'rowId and title are required' }, { status: 400 })
        }
        await renameTrainingCalendarRow({ rowId: body.rowId, title: body.title })
        return NextResponse.json({ ok: true })
      }

      case 'deleteRow': {
        if (!body.rowId) {
          return NextResponse.json({ message: 'rowId is required' }, { status: 400 })
        }
        await deleteTrainingCalendarRow(body.rowId)
        return NextResponse.json({ ok: true })
      }

      case 'setMark': {
        if (!body.rowId || typeof body.month !== 'number' || typeof body.checked !== 'boolean') {
          return NextResponse.json({ message: 'rowId, month and checked are required' }, { status: 400 })
        }
        await setTrainingCalendarMark({
          rowId:   body.rowId,
          year:    parseYear(String(body.year)),
          month:   body.month,
          checked: body.checked,
          actorId: session.user.id,
        })
        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json({ message: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}
