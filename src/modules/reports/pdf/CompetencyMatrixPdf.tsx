import { Document, Page } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { Letterhead } from './Letterhead'
import { PdfFooter } from './PdfFooter'
import { PdfTable, type PdfTableColumn } from './PdfTable'

const FORMAT_NO = '—'

interface Person {
  id:         string
  name:       string
  employeeId: string
  department: { name: string } | null
  qualificationRecords: {
    id:          string
    status:      string
    expiryDate:  Date | null
    techniqueId: string
  }[]
}

interface Technique {
  id:   string
  name: string
  code: string
}

const STATUS_LABEL: Record<string, string> = {
  APPROVED:    'Qualified',
  EXPIRED:     'Expired',
  IN_PROGRESS: 'In progress',
  INITIATED:   'Initiated',
  NONE:        '—',
}

function cellLabel(qual: Person['qualificationRecords'][number] | undefined): string {
  if (!qual) return STATUS_LABEL.NONE

  const isExpiringSoon = qual.status === 'APPROVED' && qual.expiryDate
    ? new Date(qual.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    : false

  if (isExpiringSoon) return 'Expiring soon'
  return STATUS_LABEL[qual.status] ?? qual.status
}

export function CompetencyMatrixPdf({
  persons, techniques, preparedByName, preparedDate,
}: {
  persons:    Person[]
  techniques: Technique[]
  preparedByName: string
  preparedDate:   string
}) {
  const fixedWidth = 12 // Employee ID + Name + Department
  const techWidth  = techniques.length > 0 ? (100 - fixedWidth * 3) / techniques.length : 0

  const columns: PdfTableColumn[] = [
    { key: 'employeeId', header: 'Employee ID', width: `${fixedWidth}%` },
    { key: 'name',       header: 'Name',        width: `${fixedWidth}%` },
    { key: 'department', header: 'Department',  width: `${fixedWidth}%` },
    ...techniques.map((t) => ({ key: `tech_${t.id}`, header: `${t.code}`, width: `${techWidth}%` })),
  ]

  const rows = persons.map((p) => {
    const record: Record<string, string> = {
      employeeId: p.employeeId,
      name:       p.name,
      department: p.department?.name ?? '—',
    }
    techniques.forEach((t) => {
      const qual = p.qualificationRecords.find((q) => q.techniqueId === t.id)
      record[`tech_${t.id}`] = cellLabel(qual)
    })
    return record
  })

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Letterhead
          title="COMPETENCY MATRIX"
          formatNo={FORMAT_NO}
          preparedByName={preparedByName}
          preparedDate={preparedDate}
        />
        <PdfTable columns={columns} rows={rows} />
        <PdfFooter printedByName={preparedByName} formatNo={FORMAT_NO} />
      </Page>
    </Document>
  )
}
