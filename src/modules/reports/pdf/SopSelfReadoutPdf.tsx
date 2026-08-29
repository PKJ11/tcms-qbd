import { Document, Page, View, Text } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { Letterhead } from './Letterhead'
import { PdfTable, type PdfTableColumn } from './PdfTable'
import { formatDate } from '@/lib/utils'
import type { SopSelfReadoutRow } from '../types'

// Physical form: QbD/QA/F/007-12, Ver. No. 01, Reference SOP QbD-QA-SOP-007.
const FORMAT_NO     = 'QbD/QA/F/007-12'
const VERSION_NO    = '01'
const REPLACES      = 'Nil'
const EFFECTIVE_ON  = '07-Jul-23'
const REVIEW_ON     = '06-Jul-26'
const REFERENCE_SOP = 'Reference SOP No.: QbD-QA-SOP-007'
const IPR_LINE      =
  'The document is covered under IPR of QbD and should not be reproduced without authorization.'

// The physical form's last column is "Sign/Date of Trainee" — here it carries
// the trainee's name and, on a second line, the completion date (or "N/A"
// while the readout is still pending).
const COLUMNS: PdfTableColumn[] = [
  { key: 'sr',       header: 'Sr. No.',                    width: '8%'  },
  { key: 'sopNo',    header: 'SOP No.',                    width: '20%' },
  { key: 'title',    header: 'Title',                      width: '30%' },
  { key: 'revision', header: 'Revision No.',               width: '12%' },
  { key: 'readOn',   header: 'SOP read on (Date)',         width: '13%' },
  { key: 'trainee',  header: 'Emp. Name / Date of Trainee', width: '17%' },
]

export function SopSelfReadoutPdf({
  rows, preparedByName, preparedDate,
}: {
  rows:           SopSelfReadoutRow[]
  preparedByName: string
  preparedDate:   string
}) {
  const tableRows = rows.map((r, i) => ({
    sr:       String(i + 1),
    sopNo:    r.sopNo,
    title:    r.title,
    revision: r.revisionNo,
    readOn:   r.readOn ? formatDate(r.readOn) : '—',
    trainee:  `${r.empName}\n${r.completedAt ? formatDate(r.completedAt) : 'N/A'}`,
  }))

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Letterhead
          title="LIST OF SOPS-SELF READOUT"
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
          LIST OF SOPS-SELF READOUT
        </Text>
        <Text style={[s.label, { marginBottom: 6 }]}>Date: {preparedDate}</Text>

        {tableRows.length === 0 ? (
          <Text style={s.value}>No SOP self-readout trainings found.</Text>
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
