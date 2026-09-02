import { Document, Page, View, Text } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { TrainingMatrixHeader } from './TrainingMatrixHeader'
import { PdfFooter } from './PdfFooter'
import { PdfTable, type PdfTableColumn } from './PdfTable'
import type { TrainingMatrixRow } from '../types'

const FORMAT_NO = 'QbD/QA/F/007-013'

function formatShortDate(date: Date | string): string {
  const d = new Date(date)
  const day   = String(d.getDate()).padStart(2, '0')
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const year  = String(d.getFullYear()).slice(-2)
  return `${day}-${month}-${year}`
}

export function TrainingMatrixPdf({
  matrix, preparedByName, periodLabel,
}: {
  matrix:         TrainingMatrixRow[]
  preparedByName: string
  periodLabel:    string
}) {
  const topics = matrix[0]?.topics ?? []
  const nameWidth  = 20
  const topicWidth = topics.length > 0 ? (100 - nameWidth) / topics.length : 0

  const columns: PdfTableColumn[] = [
    { key: 'name', header: 'Name of Analyst', width: `${nameWidth}%` },
    ...topics.map((t, i) => ({
      key:       `topic_${i}`,
      header:    t.topicName,
      subHeader: t.sopReference ?? undefined,
      width:     `${topicWidth}%`,
    })),
  ]

  const tableRows = matrix.map((row) => {
    const record: Record<string, string> = { name: row.person.name }
    row.topics.forEach((t, i) => {
      record[`topic_${i}`] = t.status === 'COMPLETED' && t.completedAt
        ? formatShortDate(t.completedAt)
        : t.isTrainer
        ? 'Trainer'
        : 'N/A'
    })
    return record
  })

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <TrainingMatrixHeader periodLabel={periodLabel} />

        {tableRows.length === 0 ? (
          <Text style={[s.value, { marginTop: 12 }]}>No scheduled trainings were assigned to this scope during this period.</Text>
        ) : (
          <PdfTable columns={columns} rows={tableRows} />
        )}

        {/* Note line, matching the physical form */}
        <View style={{ marginTop: 14 }}>
          <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>
            Note: Write actual Title of Document/Document No with version No. in the column, write
            actual employee name under Name of the Employee column, write actual date of training
            of employee. If trainee is absent in the column of date of training. If training is
            not applicable to trainee, then write N/A.
          </Text>
        </View>

        <PdfFooter printedByName={preparedByName} formatNo={FORMAT_NO} />
      </Page>
    </Document>
  )
}
