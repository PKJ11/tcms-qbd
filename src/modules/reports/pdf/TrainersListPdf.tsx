import { Document, Page, Text } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { Letterhead } from './Letterhead'
import { PdfFooter } from './PdfFooter'
import { PdfTable, type PdfTableColumn } from './PdfTable'
import type { TrainerListItem } from '../types'

// Physical form: QbD/QA/F/007-07, Ver. No. 07.
const FORMAT_NO  = 'QbD/QA/F/007-07'
const VERSION_NO = '07'

// "Subject" appears on the physical form but is deliberately dropped here —
// the digital list keeps only the person-identifying columns.
const COLUMNS: PdfTableColumn[] = [
  { key: 'sr',          header: 'Sr. No.',         width: '10%' },
  { key: 'name',        header: 'Name of Trainer', width: '35%' },
  { key: 'designation', header: 'Designation',     width: '27%' },
  { key: 'department',  header: 'Department',       width: '28%' },
]

export function TrainersListPdf({
  trainers, preparedByName, preparedDate,
}: {
  trainers:       TrainerListItem[]
  preparedByName: string
  preparedDate:   string
}) {
  const tableRows = trainers.map((t, i) => ({
    sr:          String(i + 1),
    name:        t.name,
    designation: t.designation || '—',
    department:  t.department ?? '—',
  }))

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Letterhead
          title="LIST OF TRAINERS"
          formatNo={FORMAT_NO}
          department="Quality Assurance"
          preparedByName={preparedByName}
          preparedDate={preparedDate}
          showControlledMeta={false}
        />

        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 6 }}>
          LIST OF TRAINERS
        </Text>
        <Text style={[s.label, { marginBottom: 6 }]}>Date: {preparedDate}</Text>

        {tableRows.length === 0 ? (
          <Text style={s.value}>No active trainers found.</Text>
        ) : (
          <PdfTable columns={COLUMNS} rows={tableRows} />
        )}

        <PdfFooter printedByName={preparedByName} formatNo={FORMAT_NO} versionNo={VERSION_NO} />
      </Page>
    </Document>
  )
}
