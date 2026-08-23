import { Document, Page } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { Letterhead } from './Letterhead'
import { PdfTable, type PdfTableColumn } from './PdfTable'
import { formatDate } from '@/lib/utils'
import type { TopicCompletionReport } from '../types'

const COLUMNS: PdfTableColumn[] = [
  { key: 'name',      header: 'Trainee',           width: '18%' },
  { key: 'status',    header: 'Status',            width: '10%' },
  { key: 'assigned',  header: 'Assigned',          width: '10%' },
  { key: 'due',       header: 'Due',               width: '10%' },
  { key: 'completed', header: 'Completed',         width: '10%' },
  { key: 'assignedBy',header: 'Assigned by',       width: '12%' },
  { key: 'bankVer',   header: 'Questions version', width: '13%' },
  { key: 'matVer',    header: 'Material version(s)', width: '17%' },
]

export function TopicCompletionPdf({
  report, preparedByName, preparedDate,
}: {
  report: TopicCompletionReport
  preparedByName: string
  preparedDate:   string
}) {
  const tableRows = report.trainees.map((t) => ({
    name:       `${t.name} (${t.employeeId})`,
    status:     t.status,
    assigned:   formatDate(t.assignedAt),
    due:        formatDate(t.dueDate),
    completed:  formatDate(t.completedAt),
    assignedBy: t.assignedBy,
    bankVer:    t.questionBankVersionLabel ?? '—',
    matVer:     t.materialVersionLabels.join('; ') || '—',
  }))

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Letterhead
          title="TOPIC COMPLETION REPORT"
          formatNo="—"
          preparedByName={preparedByName}
          preparedDate={preparedDate}
          contextLine={`Topic: ${report.topicName}  ·  Created by: ${report.trainerName}`}
        />
        <PdfTable columns={COLUMNS} rows={tableRows} />
      </Page>
    </Document>
  )
}
