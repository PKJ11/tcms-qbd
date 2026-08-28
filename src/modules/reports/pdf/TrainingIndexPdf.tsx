import { Document, Page, View, Text } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { TrainingIndexHeader } from './TrainingIndexHeader'
import { PdfTable, type PdfTableColumn } from './PdfTable'
import { formatDate } from '@/lib/utils'
import type { TrainingIndexEntry } from '../types'

const REFERENCE_SOP_NO = 'QbD-QA-SOP-007'

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
  personDesignation,
  personDepartment,
  preparedByName,
  preparedByTitle,
  preparedDate,
  reviewedByName,
  reviewedByTitle,
}: {
  entries:            TrainingIndexEntry[]
  personName:         string
  personEmployeeId:   string
  personDesignation:  string
  personDepartment:   string
  preparedByName:     string
  preparedByTitle:    string
  preparedDate:       string
  reviewedByName:     string
  reviewedByTitle:    string
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
        <TrainingIndexHeader
          preparedByName={preparedByName}
          preparedByTitle={preparedByTitle}
          preparedDate={preparedDate}
          reviewedByName={reviewedByName}
          reviewedByTitle={reviewedByTitle}
        />

        {/* Plain identification lines — not a bordered table, matching the
            physical form */}
        <Text style={[s.label, { marginTop: 12 }]}>Reference SOP No.: {REFERENCE_SOP_NO}</Text>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 14, textAlign: 'center', marginTop: 6 }}>
          TRAINING INDEX
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          <Text style={[s.label, { flex: 1 }]}>Name of Employee: {personName} ({personEmployeeId})</Text>
          <Text style={[s.label, { flex: 1 }]}>Department: {personDepartment}</Text>
        </View>
        <Text style={[s.label, { marginTop: 4, marginBottom: 8 }]}>Designation: {personDesignation}</Text>

        {tableRows.length === 0 ? (
          <Text style={[s.value, { marginTop: 12 }]}>No completed trainings on record for this person.</Text>
        ) : (
          <PdfTable columns={COLUMNS} rows={tableRows} />
        )}
      </Page>
    </Document>
  )
}
