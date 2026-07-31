import { Document, Page } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { Letterhead } from './Letterhead'
import { PdfTable, type PdfTableColumn } from './PdfTable'
import { formatDate } from '@/lib/utils'
import type { TrainingIndexEntry } from '../types'

const COLUMNS: PdfTableColumn[] = [
  { key: 'topic',     header: 'Topic',          width: '22%' },
  { key: 'trigger',   header: 'Trigger',        width: '10%' },
  { key: 'status',    header: 'Status',         width: '11%' },
  { key: 'assigned',  header: 'Assigned date',  width: '11%' },
  { key: 'due',       header: 'Due date',       width: '11%' },
  { key: 'completed', header: 'Completed date', width: '11%' },
  { key: 'score',     header: 'Score',          width: '7%'  },
  { key: 'outcome',   header: 'Outcome',        width: '8%'  },
  { key: 'assignedBy',header: 'Assigned by',    width: '9%'  },
]

export function TrainingIndexPdf({
  entries, personName, personEmployeeId, preparedByName, preparedDate,
}: {
  entries: TrainingIndexEntry[]
  personName: string
  personEmployeeId: string
  preparedByName: string
  preparedDate:   string
}) {
  const tableRows = entries.map((e) => ({
    topic:      e.topicName,
    trigger:    e.trigger,
    status:     e.status,
    assigned:   formatDate(e.assignedAt),
    due:        formatDate(e.dueDate),
    completed:  formatDate(e.completedAt),
    score:      e.score?.toString() ?? '—',
    outcome:    e.outcome ?? '—',
    assignedBy: e.assignedBy,
  }))

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Letterhead
          title="TRAINING INDEX"
          formatNo="QbD/QA/F/007-09 · URS-RPT-002"
          preparedByName={preparedByName}
          preparedDate={preparedDate}
          contextLine={`Employee: ${personName} (${personEmployeeId})`}
        />
        <PdfTable columns={COLUMNS} rows={tableRows} />
      </Page>
    </Document>
  )
}
