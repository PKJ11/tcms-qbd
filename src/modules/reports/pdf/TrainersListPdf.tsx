import { Document, Page, View, Text } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { Letterhead } from './Letterhead'
import { PdfTable, type PdfTableColumn } from './PdfTable'
import type { TrainerListItem } from '../types'

// Physical form: QbD/QA/F/007-07, Ver. No. 07, Reference SOP QbD-QA-SOP-007.
const FORMAT_NO     = 'QbD/QA/F/007-07'
const VERSION_NO    = '07'
const REPLACES      = 'QbD/QA/F/007-07, V.06'
const EFFECTIVE_ON  = '21-Mar-22'
const REVIEW_ON     = '20-Mar-25'
const REFERENCE_SOP = 'Reference SOP No.: QbD-QA-SOP-007'
const IPR_LINE      =
  'The document is covered under IPR of QbD and should not be reproduced without authorization.'

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
          versionNo={VERSION_NO}
          replaces={REPLACES}
          effectiveOn={EFFECTIVE_ON}
          reviewOn={REVIEW_ON}
          department="Quality Assurance"
          preparedByName={preparedByName}
          preparedDate={preparedDate}
          preparedByTitle="Executive - II QA"
          contextLine={REFERENCE_SOP}
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

        <View style={{ flexDirection: 'row', marginTop: 24 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Prepared by :</Text>
            <Text style={[s.value, { marginTop: 10 }]}>(Executive QA)</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Approved by :</Text>
            <Text style={[s.value, { marginTop: 10 }]}>(Head QA / Designee)</Text>
          </View>
        </View>

        <Text style={{ fontSize: 7, marginTop: 20, textAlign: 'center' }}>{IPR_LINE}</Text>
        <Text style={[s.label, { marginTop: 8 }]}>Format No. {FORMAT_NO}</Text>
      </Page>
    </Document>
  )
}
