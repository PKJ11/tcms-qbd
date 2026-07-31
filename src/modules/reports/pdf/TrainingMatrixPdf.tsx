import { Document, Page } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { Letterhead } from './Letterhead'
import { PdfTable, type PdfTableColumn } from './PdfTable'
import type { TrainingMatrixRow } from '../types'

export function TrainingMatrixPdf({
  matrix, preparedByName, preparedDate,
}: {
  matrix: TrainingMatrixRow[]
  preparedByName: string
  preparedDate:   string
}) {
  const topicNames = matrix[0]?.topics.map((t) => t.topicName) ?? []
  const fixedWidth = 12 // Employee ID + Name + Department
  const topicWidth = topicNames.length > 0 ? (100 - fixedWidth * 3) / topicNames.length : 0

  const columns: PdfTableColumn[] = [
    { key: 'employeeId', header: 'Employee ID', width: `${fixedWidth}%` },
    { key: 'name',       header: 'Name',        width: `${fixedWidth}%` },
    { key: 'department', header: 'Department',  width: `${fixedWidth}%` },
    ...topicNames.map((name, i) => ({ key: `topic_${i}`, header: name, width: `${topicWidth}%` })),
  ]

  const tableRows = matrix.map((row) => {
    const record: Record<string, string> = {
      employeeId: row.person.employeeId,
      name:       row.person.name,
      department: row.person.department?.name ?? '—',
    }
    row.topics.forEach((t, i) => { record[`topic_${i}`] = t.status })
    return record
  })

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Letterhead
          title="TRAINING MATRIX REPORT"
          formatNo="QbD/QA/F/007-13"
          preparedByName={preparedByName}
          preparedDate={preparedDate}
        />
        <PdfTable columns={columns} rows={tableRows} />
      </Page>
    </Document>
  )
}
