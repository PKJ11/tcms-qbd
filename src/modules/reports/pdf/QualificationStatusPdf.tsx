import { Document, Page } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { Letterhead } from './Letterhead'
import { PdfFooter } from './PdfFooter'
import { PdfTable, type PdfTableColumn } from './PdfTable'
import { formatDate } from '@/lib/utils'
import type { QualificationStatusRow } from '../types'

const FORMAT_NO = 'URS-RPT-004'

const COLUMNS: PdfTableColumn[] = [
  { key: 'name',       header: 'Person',          width: '22%' },
  { key: 'department', header: 'Department',      width: '15%' },
  { key: 'technique',  header: 'Technique',       width: '19%' },
  { key: 'status',     header: 'Status',          width: '10%' },
  { key: 'outcome',    header: 'Outcome',         width: '10%' },
  { key: 'approved',   header: 'Approved date',   width: '12%' },
  { key: 'cert',       header: 'Certificate no.', width: '12%' },
]

export function QualificationStatusPdf({
  rows, preparedByName, preparedDate,
}: {
  rows: QualificationStatusRow[]
  preparedByName: string
  preparedDate:   string
}) {
  const tableRows = rows.map((r) => ({
    name:       `${r.person.name} (${r.person.employeeId})`,
    department: r.person.department ?? '—',
    technique:  r.technique,
    status:     r.status,
    outcome:    r.outcome ?? '—',
    approved:   formatDate(r.approvedAt),
    cert:       r.certNumber ?? '—',
  }))

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Letterhead
          title="QUALIFICATION STATUS REPORT"
          formatNo={FORMAT_NO}
          preparedByName={preparedByName}
          preparedDate={preparedDate}
        />
        <PdfTable columns={COLUMNS} rows={tableRows} />
        <PdfFooter printedByName={preparedByName} formatNo={FORMAT_NO} />
      </Page>
    </Document>
  )
}
