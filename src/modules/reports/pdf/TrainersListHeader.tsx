// Dedicated header for the List of Trainers PDF — deliberately NOT sharing
// implementation with the other reports' headers. Per request, this one is
// intentionally minimal: just the QbD logo and company name, no format
// number / version / sign-off grid.
import { View, Text, Image } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { getLogoDataUri } from './logo'

export function TrainersListHeader() {
  return (
    <View fixed>
      <View style={s.headerBox}>
        <View style={s.rowLast}>
          <View style={s.logoCell}>
            <Image style={s.logoImage} src={getLogoDataUri()} />
          </View>
          <View style={[s.companyNameCell, { flex: 1 }]}>
            <Text style={s.companyName}>QbD Research and Development Lab PVT. LTD.</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
