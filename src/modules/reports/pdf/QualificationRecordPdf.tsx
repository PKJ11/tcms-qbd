import { Document, Page, View, Text } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { Letterhead } from './Letterhead'
import { PdfFooter } from './PdfFooter'
import { PdfTable, type PdfTableColumn } from './PdfTable'
import { formatDate } from '@/lib/utils'

const FORMAT_NO = '—'

interface QualificationRecordPdfData {
  status:      string
  outcome:     string | null
  performedOn: Date | null
  initiatedAt: Date
  approvedAt:  Date | null
  person:      { name: string; employeeId: string; department: { name: string } | null }
  technique:   { name: string; code: string; type: string }
  supervisor:  { name: string } | null
  initiatedBy: { name: string }
  signatories: {
    stepOrder: number
    requiredRole: string
    status: string
    signedAt: Date | null
    justification: string | null
    signedBy: { name: string } | null
  }[]
  certificate: { certNumber: string; issuedAt: Date } | null
  scannedDocuments: {
    fileName: string
    description: string
    uploadedAt: Date
    uploadedBy: { name: string }
  }[]
}

const SIGNATORY_COLUMNS: PdfTableColumn[] = [
  { key: 'step',     header: 'Step',          width: '8%'  },
  { key: 'role',     header: 'Role',          width: '20%' },
  { key: 'status',   header: 'Status',        width: '12%' },
  { key: 'signedBy', header: 'Signed by',     width: '18%' },
  { key: 'signedAt', header: 'Signed at',     width: '14%' },
  { key: 'note',     header: 'Justification', width: '28%' },
]

const DOCUMENT_COLUMNS: PdfTableColumn[] = [
  { key: 'fileName',    header: 'File name',    width: '25%' },
  { key: 'description', header: 'Description',  width: '35%' },
  { key: 'uploadedAt',  header: 'Uploaded at',  width: '15%' },
  { key: 'uploadedBy',  header: 'Uploaded by',  width: '25%' },
]

export function QualificationRecordPdf({
  qual, preparedByName, preparedDate,
}: {
  qual: QualificationRecordPdfData
  preparedByName: string
  preparedDate:   string
}) {
  const signatoryRows = qual.signatories.map((sig) => ({
    step:     `${sig.stepOrder}`,
    role:     sig.requiredRole.replace(/_/g, ' '),
    status:   sig.status,
    signedBy: sig.signedBy?.name ?? '—',
    signedAt: formatDate(sig.signedAt),
    note:     sig.justification ?? '—',
  }))

  const documentRows = qual.scannedDocuments.map((doc) => ({
    fileName:    doc.fileName,
    description: doc.description,
    uploadedAt:  formatDate(doc.uploadedAt),
    uploadedBy:  doc.uploadedBy.name,
  }))

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Letterhead
          title="QUALIFICATION / COMPETENCY RECORD"
          formatNo={FORMAT_NO}
          preparedByName={preparedByName}
          preparedDate={preparedDate}
          contextLine={`${qual.person.name} (${qual.person.employeeId})  ·  ${qual.technique.name} (${qual.technique.code})`}
        />

        <View style={s.kvGrid}>
          <View style={s.kvItem}>
            <Text style={s.kvLabel}>Status</Text>
            <Text style={s.kvValue}>{qual.status}</Text>
          </View>
          <View style={[s.kvItem, { borderRightWidth: 0 }]}>
            <Text style={s.kvLabel}>Outcome</Text>
            <Text style={s.kvValue}>{qual.outcome ?? '—'}</Text>
          </View>
          <View style={s.kvItem}>
            <Text style={s.kvLabel}>Department</Text>
            <Text style={s.kvValue}>{qual.person.department?.name ?? '—'}</Text>
          </View>
          <View style={[s.kvItem, { borderRightWidth: 0 }]}>
            <Text style={s.kvLabel}>Technique type</Text>
            <Text style={s.kvValue}>{qual.technique.type}</Text>
          </View>
          <View style={s.kvItem}>
            <Text style={s.kvLabel}>Supervisor</Text>
            <Text style={s.kvValue}>{qual.supervisor?.name ?? '—'}</Text>
          </View>
          <View style={[s.kvItem, { borderRightWidth: 0 }]}>
            <Text style={s.kvLabel}>Initiated by</Text>
            <Text style={s.kvValue}>{qual.initiatedBy.name}</Text>
          </View>
          <View style={s.kvItem}>
            <Text style={s.kvLabel}>Performed on</Text>
            <Text style={s.kvValue}>{formatDate(qual.performedOn)}</Text>
          </View>
          <View style={[s.kvItem, { borderRightWidth: 0 }]}>
            <Text style={s.kvLabel}>Initiated at</Text>
            <Text style={s.kvValue}>{formatDate(qual.initiatedAt)}</Text>
          </View>
          <View style={[s.kvItem, { width: '100%', borderRightWidth: 0, borderBottomWidth: 0 }]}>
            <Text style={s.kvLabel}>Approved at</Text>
            <Text style={s.kvValue}>{formatDate(qual.approvedAt)}</Text>
          </View>
        </View>

        {qual.certificate && (
          <View style={s.kvGrid}>
            <View style={s.kvItem}>
              <Text style={s.kvLabel}>Certificate number</Text>
              <Text style={s.kvValue}>{qual.certificate.certNumber}</Text>
            </View>
            <View style={[s.kvItem, { borderRightWidth: 0, borderBottomWidth: 0 }]}>
              <Text style={s.kvLabel}>Issued at</Text>
              <Text style={s.kvValue}>{formatDate(qual.certificate.issuedAt)}</Text>
            </View>
            <View style={[s.kvItem, { borderBottomWidth: 0 }]} />
          </View>
        )}

        <Text style={s.contextLine}>Sign-off chain</Text>
        <PdfTable columns={SIGNATORY_COLUMNS} rows={signatoryRows} />

        <Text style={s.contextLine}>Evidence documents</Text>
        {documentRows.length > 0 ? (
          <PdfTable columns={DOCUMENT_COLUMNS} rows={documentRows} />
        ) : (
          <Text style={s.value}>No evidence documents uploaded.</Text>
        )}

        <PdfFooter printedByName={preparedByName} formatNo={FORMAT_NO} />
      </Page>
    </Document>
  )
}
