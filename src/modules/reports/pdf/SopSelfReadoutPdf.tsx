import { Document, Page, Text } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { Letterhead } from './Letterhead'
import { PdfFooter } from './PdfFooter'
import { PdfTable, type PdfTableColumn } from './PdfTable'
import { formatDate } from '@/lib/utils'
import type { SopSelfReadoutRow } from '../types'

// Physical form: QbD/QA/F/007-12, Ver. No. 01.
const FORMAT_NO  = 'QbD/QA/F/007-12'
const VERSION_NO = '01'

// The physical form's last column is "Sign/Date of Trainee" — here it carries
// the trainee's name and, on a second line, the completion date (or "N/A"
// while the readout is still pending).
const COLUMNS: PdfTableColumn[] = [
  { key: 'sr',      header: 'Sr. No.',                    width: '8%'  },
  { key: 'title',   header: 'Title',                      width: '44%' },
  { key: 'readOn',  header: 'SOP read on (Date)',         width: '22%' },
  { key: 'trainee', header: 'Emp. Name / Date of Trainee', width: '26%' },
]

export function SopSelfReadoutPdf({
  rows, preparedByName, preparedDate,
}: {
  rows:           SopSelfReadoutRow[]
  preparedByName: string
  preparedDate:   string
}) {
  const tableRows = rows.map((r, i) => ({
    sr:      String(i + 1),
    title:   r.title,
    readOn:  r.readOn ? formatDate(r.readOn) : '—',
    trainee: `${r.empName}\n${r.completedAt ? formatDate(r.completedAt) : 'N/A'}`,
  }))

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Letterhead
          title="LIST OF SOPS-SELF READOUT"
          formatNo={FORMAT_NO}
          department="Quality Assurance"
          preparedByName={preparedByName}
          preparedDate={preparedDate}
          showControlledMeta={false}
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

        <PdfFooter printedByName={preparedByName} formatNo={FORMAT_NO} versionNo={VERSION_NO} />
      </Page>
    </Document>
  )
}
