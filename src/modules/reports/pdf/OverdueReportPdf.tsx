import { Document, Page } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { Letterhead } from './Letterhead'
import { PdfTable, type PdfTableColumn } from './PdfTable'
import { formatDate } from '@/lib/utils'
import type { OverdueReportRow } from '../types'

const COLUMNS: PdfTableColumn[] = [
  { key: 'name',        header: 'Person',       width: '20%' },
  { key: 'department',  header: 'Department',   width: '13%' },
  { key: 'topic',       header: 'Topic',        width: '19%' },
  { key: 'trigger',     header: 'Trigger',      width: '11%' },
  { key: 'due',         header: 'Due date',     width: '11%' },
  { key: 'overdue',     header: 'Days overdue', width: '10%' },
  { key: 'manager',     header: 'Manager',      width: '16%' },
]

export function OverdueReportPdf({
  rows, preparedByName, preparedDate,
}: {
  rows: OverdueReportRow[]
  preparedByName: string
  preparedDate:   string
}) {
  const tableRows = rows.map((r) => ({
    name:       `${r.person.name} (${r.person.employeeId})`,
    department: r.person.department ?? '—',
    topic:      r.assignment.topicName,
    trigger:    r.assignment.trigger,
    due:        formatDate(r.assignment.dueDate),
    overdue:    `${r.assignment.daysOverdue}d`,
    manager:    r.person.manager ?? '—',
  }))

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Letterhead
          title="OVERDUE TRAINING REPORT"
          formatNo="URS-RPT-003"
          preparedByName={preparedByName}
          preparedDate={preparedDate}
        />
        <PdfTable columns={COLUMNS} rows={tableRows} />
      </Page>
    </Document>
  )
}
