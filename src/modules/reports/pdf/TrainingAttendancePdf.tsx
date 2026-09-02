import { Document, Page, Text } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { TrainingAttendanceHeader } from './TrainingAttendanceHeader'
import { PdfFooter } from './PdfFooter'
import { PdfTable, type PdfTableColumn } from './PdfTable'
import { formatDate } from '@/lib/utils'
import type { TrainingAttendanceRecord } from '../types'

const FORMAT_NO = 'QbD/QA/F/007-02'

const COLUMNS: PdfTableColumn[] = [
  { key: 'sr',         header: 'Sr. No',          width: '8%'  },
  { key: 'name',       header: 'Name of Trainee', width: '34%' },
  { key: 'department', header: 'Department',      width: '24%' },
  { key: 'assigned',   header: 'Assigned On',     width: '17%' },
  { key: 'sign',       header: 'Sign/Date',       width: '17%' },
]

// "QbD-QC-SOP-067, Ver.No. 04" -> "QbD-QC-SOP-067" (the document number only).
function documentNoOf(sopReference: string | null): string {
  if (!sopReference) return ''
  return sopReference.split(',')[0].trim()
}

export function TrainingAttendancePdf({
  record, printedByName,
}: {
  record:        TrainingAttendanceRecord
  printedByName: string
}) {
  const tableRows = record.attendees.map((a, i) => ({
    sr:         String(i + 1),
    name:       a.name,
    department: a.department ?? '—',
    assigned:   formatDate(a.assignedAt),
    // "Sign/Date" carries the completion date — the digital equivalent of
    // the trainee dating the sheet on the day they were trained. Blank
    // while the training is still pending.
    sign:       a.completedAt ? formatDate(a.completedAt) : '',
  }))

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <TrainingAttendanceHeader
          topicName={record.topicName}
          documentNo={documentNoOf(record.sopReference)}
          trainerName={record.trainerName ?? '—'}
        />

        {tableRows.length === 0 ? (
          <Text style={[s.value, { marginTop: 12 }]}>This topic has not been assigned to anyone yet.</Text>
        ) : (
          <PdfTable columns={COLUMNS} rows={tableRows} />
        )}

        <PdfFooter printedByName={printedByName} formatNo={FORMAT_NO} />
      </Page>
    </Document>
  )
}
