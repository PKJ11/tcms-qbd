// Dedicated header for the Training Index PDF — deliberately NOT sharing
// implementation with other reports' headers (see TrainingMatrixHeader.tsx)
// so each document's header can evolve/be corrected independently.
import { View, Text, Image } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { getLogoDataUri } from './logo'

// Controlled-document identity for this format — fixed, matching the
// physical QbD "Training Index" form. Not data about the employee, so it
// doesn't vary per print. Shown only in the page footer (see PdfFooter.tsx).
export const FORMAT_NO  = 'QbD/QA/F/007-09'
export const VERSION_NO = '04'

export function TrainingIndexHeader() {
  return (
    <View fixed>
      <View style={s.headerBox}>
        <View style={s.row}>
          <View style={s.logoCell}>
            <Image style={s.logoImage} src={getLogoDataUri()} />
          </View>
          <View style={s.companyNameCell}>
            <Text style={s.companyName}>QbD Research and Development Lab PVT. LTD.</Text>
          </View>
        </View>

        <View style={s.row}>
          <Text style={[s.formatBar, { flex: 1 }]}>FORMAT</Text>
        </View>

        <View style={s.row}>
          <View style={[s.cell, { flex: 3 }]}>
            <Text style={s.label}>Title: TRAINING INDEX</Text>
          </View>
          <Text
            style={[s.cellLast, { flex: 1, textAlign: 'right' }, s.label]}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>

        <View style={s.rowLast}>
          <View style={[s.cellLast, { flex: 1 }]}>
            <Text style={s.label}>Department: Quality Assurance</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
