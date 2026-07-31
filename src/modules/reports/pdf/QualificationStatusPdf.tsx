import { Document, Page } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { Letterhead } from './Letterhead'
import { PdfTable, type PdfTableColumn } from './PdfTable'
import { formatDate } from '@/lib/utils'
import type { QualificationStatusRow } from '../types'

const COLUMNS: PdfTableColumn[] = [
  { key: 'name',       header: 'Person',          width: '18%' },
  { key: 'department', header: 'Department',      width: '13%' },
  { key: 'technique',  header: 'Technique',       width: '15%' },
  { key: 'status',     header: 'Status',          width: '10%' },
  { key: 'outcome',    header: 'Outcome',         width: '9%'  },
  { key: 'approved',   header: 'Approved date',   width: '10%' },
  { key: 'expiry',     header: 'Expiry date',     width: '10%' },
  { key: 'daysLeft',   header: 'Days left',       width: '7%'  },
  { key: 'cert',       header: 'Certificate no.', width: '8%'  },
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
    expiry:     formatDate(r.expiryDate),
    daysLeft:   r.daysToExpiry?.toString() ?? '—',
    cert:       r.certNumber ?? '—',
  }))

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Letterhead
          title="QUALIFICATION STATUS REPORT"
          formatNo="URS-RPT-004"
          preparedByName={preparedByName}
          preparedDate={preparedDate}
        />
        <PdfTable columns={COLUMNS} rows={tableRows} />
      </Page>
    </Document>
  )
}
