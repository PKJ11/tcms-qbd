// Dedicated header for the Training Index PDF — deliberately NOT sharing
// implementation with other reports' headers (see TrainingMatrixHeader.tsx)
// so each document's header can evolve/be corrected independently.
import { View, Text, Image } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { getLogoDataUri } from './logo'

// Controlled-document identity for this format — fixed, matching the
// physical QbD-QA-SOP-007 "Training Index" form. Not data about the
// employee, so it doesn't vary per print.
const FORMAT_NO    = 'QbD/QA/F/007-09'
const VERSION_NO   = '04'
const REPLACES     = 'QbD/QA/F/007-09, V.03'
const EFFECTIVE_ON = '21-May-22'
const REVIEW_ON    = '20-May-25'

export interface TrainingIndexHeaderProps {
  preparedByName:  string
  preparedByTitle: string
  preparedDate:    string
  reviewedByName:  string
  reviewedByTitle: string
}

export function TrainingIndexHeader({
  preparedByName, preparedByTitle, preparedDate, reviewedByName, reviewedByTitle,
}: TrainingIndexHeaderProps) {
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

        <View style={s.row}>
          <View style={[s.cell, { flex: 3 }]}>
            <Text style={s.label}>Department: Quality Assurance</Text>
          </View>
          <View style={[s.cellLast, { flex: 1 }]}>
            <Text style={s.label}>Format No. {FORMAT_NO}</Text>
          </View>
        </View>

        <View style={s.row}>
          <View style={[s.cell, { flex: 1 }]}><Text style={s.label}>Ver. No.: {VERSION_NO}</Text></View>
          <View style={[s.cell, { flex: 1 }]}><Text style={s.label}>Replaces: {REPLACES}</Text></View>
          <View style={[s.cell, { flex: 1 }]}><Text style={s.label}>Effective On: {EFFECTIVE_ON}</Text></View>
          <View style={[s.cellLast, { flex: 1 }]}><Text style={s.label}>Review On: {REVIEW_ON}</Text></View>
        </View>

        <View style={s.row}>
          <View style={[s.cell, { flex: 1 }, s.signBlock]}>
            <Text style={s.label}>Prepared By:</Text>
            <Text style={s.value}>Date: {preparedDate}</Text>
            <Text style={s.value}>Name: {preparedByName}</Text>
            <Text style={s.value}>Title: {preparedByTitle}</Text>
          </View>
          <View style={[s.cell, { flex: 1 }, s.signBlock]}>
            <Text style={s.label}>Reviewed By:</Text>
            <Text style={s.value}>Date: {preparedDate}</Text>
            <Text style={s.value}>Name: {reviewedByName}</Text>
            <Text style={s.value}>Title: {reviewedByTitle}</Text>
          </View>
          <View style={[s.cellLast, { flex: 1 }, s.signBlock]}>
            <Text style={s.label}>Approved By:</Text>
            <Text style={s.value}>Date: {preparedDate}</Text>
            <Text style={s.value}>Name: {reviewedByName}</Text>
            <Text style={s.value}>Title: {reviewedByTitle}</Text>
          </View>
        </View>

        <View style={s.rowLast}>
          <View style={[s.cellLast, { flex: 1 }]}>
            <Text style={s.label}>Copy No.: —</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
