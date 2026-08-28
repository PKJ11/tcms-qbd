import { Document, Page, Text } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { TrainersListHeader } from './TrainersListHeader'
import { PdfTable, type PdfTableColumn } from './PdfTable'
import type { TrainerListItem } from '../types'

const COLUMNS: PdfTableColumn[] = [
  { key: 'sr',         header: 'Sr. No',      width: '8%'  },
  { key: 'name',       header: 'Name',        width: '24%' },
  { key: 'employeeId', header: 'Employee ID', width: '12%' },
  { key: 'department', header: 'Department',  width: '20%' },
  { key: 'unit',       header: 'Unit',        width: '18%' },
  { key: 'section',    header: 'Section',     width: '18%' },
]

export function TrainersListPdf({ trainers }: { trainers: TrainerListItem[] }) {
  const tableRows = trainers.map((t, i) => ({
    sr:         String(i + 1),
    name:       t.name,
    employeeId: t.employeeId,
    department: t.department ?? '—',
    unit:       t.unit       ?? '—',
    section:    t.section    ?? '—',
  }))

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <TrainersListHeader />

        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 14, textAlign: 'center', marginTop: 12, marginBottom: 8 }}>
          LIST OF TRAINERS
        </Text>

        {tableRows.length === 0 ? (
          <Text style={s.value}>No active trainers found.</Text>
        ) : (
          <PdfTable columns={COLUMNS} rows={tableRows} />
        )}
      </Page>
    </Document>
  )
}
