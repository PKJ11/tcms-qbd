import { Document, Page, View, Text } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { TrainingIndexHeader, FORMAT_NO, VERSION_NO } from './TrainingIndexHeader'
import { PdfFooter } from './PdfFooter'
import { PdfTable, type PdfTableColumn } from './PdfTable'
import { formatDate } from '@/lib/utils'
import type { TrainingIndexEntry } from '../types'

const COLUMNS: PdfTableColumn[] = [
  { key: 'sr',      header: 'Sr. No',                                  width: '8%'  },
  { key: 'topic',   header: 'Topic of the Training',                   width: '37%' },
  { key: 'date',    header: 'Date of the Training',                    width: '20%' },
  { key: 'subject', header: 'SOP Number and Version or subject',       width: '35%' },
]

export function TrainingIndexPdf({
  entries,
  personName,
  personEmployeeId,
  personDepartment,
  printedByName,
}: {
  entries:            TrainingIndexEntry[]
  personName:         string
  personEmployeeId:   string
  personDepartment:   string
  printedByName:      string
}) {
  // The printed index is a completion log — only trainings with an actual
  // "date of the training" belong in it — sorted oldest-first like a
  // running career record.
  const completed = entries
    .filter((e) => e.completedAt)
    .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime())

  const tableRows = completed.map((e, i) => ({
    sr:      String(i + 1),
    topic:   e.topicName,
    date:    formatDate(e.completedAt),
    subject: e.topicDescription ?? e.topicName,
  }))

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <TrainingIndexHeader />

        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 14, textAlign: 'center', marginTop: 12 }}>
          TRAINING INDEX
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 6, marginBottom: 8 }}>
          <Text style={[s.label, { flex: 1 }]}>Name of Employee: {personName} ({personEmployeeId})</Text>
          <Text style={[s.label, { flex: 1 }]}>Department: {personDepartment}</Text>
        </View>

        {tableRows.length === 0 ? (
          <Text style={[s.value, { marginTop: 12 }]}>No completed trainings on record for this person.</Text>
        ) : (
          <PdfTable columns={COLUMNS} rows={tableRows} />
        )}

        <PdfFooter printedByName={printedByName} formatNo={FORMAT_NO} versionNo={VERSION_NO} />
      </Page>
    </Document>
  )
}
