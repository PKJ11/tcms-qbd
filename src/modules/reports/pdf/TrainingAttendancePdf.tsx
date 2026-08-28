import { Document, Page, View, Text } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { TrainingAttendanceHeader } from './TrainingAttendanceHeader'
import { PdfTable, type PdfTableColumn } from './PdfTable'
import type { TrainingAttendanceRecord } from '../types'

const FORMAT_NO = 'QbD/QA/F/007-02'

const COLUMNS: PdfTableColumn[] = [
  { key: 'sr',         header: 'Sr. No',           width: '10%' },
  { key: 'name',       header: 'Name of Trainee',  width: '45%' },
  { key: 'department', header: 'Department',       width: '25%' },
  { key: 'sign',       header: 'Sign/Date',        width: '20%' },
]

// "QbD-QC-SOP-067, Ver.No. 04" -> { documentNo: "QbD-QC-SOP-067", versionNo: "Ver.No. 04" }
function splitSopReference(sopReference: string | null): { documentNo: string; versionNo: string } {
  if (!sopReference) return { documentNo: '', versionNo: '' }
  const [first, ...rest] = sopReference.split(',')
  return { documentNo: first.trim(), versionNo: rest.join(',').trim() }
}

export function TrainingAttendancePdf({
  record, dateLabel,
}: {
  record:    TrainingAttendanceRecord
  dateLabel: string
}) {
  const { documentNo, versionNo } = splitSopReference(record.sopReference)

  const tableRows = record.attendees.map((a, i) => ({
    sr:         String(i + 1),
    name:       a.name,
    department: a.department ?? '—',
    sign:       '',
  }))

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <TrainingAttendanceHeader
          topicName={record.topicName}
          documentNo={documentNo}
          versionNo={versionNo}
          trainerName={record.trainerName ?? '—'}
          dateLabel={dateLabel}
        />

        {tableRows.length === 0 ? (
          <Text style={[s.value, { marginTop: 12 }]}>No one completed this training on the chosen date.</Text>
        ) : (
          <PdfTable columns={COLUMNS} rows={tableRows} />
        )}

        <View style={{ marginTop: 24 }}>
          <Text style={s.label}>Trainer (Sign/Date): _______________________</Text>
        </View>

        <Text style={[s.label, { marginTop: 16 }]}>Format No. {FORMAT_NO}</Text>
      </Page>
    </Document>
  )
}
