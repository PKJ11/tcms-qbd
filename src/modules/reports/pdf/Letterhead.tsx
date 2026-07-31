import { View, Text, Image } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { getLogoDataUri } from './logo'

export interface LetterheadProps {
  title:          string
  formatNo:       string
  preparedByName: string
  preparedDate:   string
  contextLine?:   string
}

export function Letterhead({ title, formatNo, preparedByName, preparedDate, contextLine }: LetterheadProps) {
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
            <Text style={s.label}>Title: {title}</Text>
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
            <Text style={s.label}>Format No. {formatNo}</Text>
          </View>
        </View>

        <View style={s.row}>
          <View style={[s.cell, { flex: 1 }]}><Text style={s.label}>Ver. No.: —</Text></View>
          <View style={[s.cell, { flex: 1 }]}><Text style={s.label}>Replaces: —</Text></View>
          <View style={[s.cell, { flex: 1 }]}><Text style={s.label}>Effective On: —</Text></View>
          <View style={[s.cellLast, { flex: 1 }]}><Text style={s.label}>Review On: —</Text></View>
        </View>

        <View style={s.row}>
          <View style={[s.cell, { flex: 1 }, s.signBlock]}>
            <Text style={s.label}>Prepared By:</Text>
            <Text style={s.value}>Date: {preparedDate}</Text>
            <Text style={s.value}>Name: {preparedByName}</Text>
            <Text style={s.value}>Title:</Text>
          </View>
          <View style={[s.cell, { flex: 1 }, s.signBlock]}>
            <Text style={s.label}>Reviewed By:</Text>
            <Text style={s.value}>Date:</Text>
            <Text style={s.value}>Name:</Text>
            <Text style={s.value}>Title:</Text>
          </View>
          <View style={[s.cellLast, { flex: 1 }, s.signBlock]}>
            <Text style={s.label}>Approved By:</Text>
            <Text style={s.value}>Date:</Text>
            <Text style={s.value}>Name:</Text>
            <Text style={s.value}>Title:</Text>
          </View>
        </View>

        <View style={s.rowLast}>
          <View style={[s.cellLast, { flex: 1 }]}>
            <Text style={s.label}>Copy No.: —</Text>
          </View>
        </View>
      </View>

      {contextLine && <Text style={s.contextLine}>{contextLine}</Text>}
    </View>
  )
}
