// Dedicated header for the Training Matrix PDF — deliberately NOT sharing
// implementation with other reports' headers (see TrainingIndexHeader.tsx),
// modelled on the physical "TRAINING MATRIX TO TRACK TRAINING OF EMPLOYEES"
// form rather than the generic QbD "FORMAT" letterhead used elsewhere.
import { View, Text, Image } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { getLogoDataUri } from './logo'

const REFERENCE_SOP_NO = 'QbD-QA-SOP-007'

export interface TrainingMatrixHeaderProps {
  periodLabel: string // e.g. "Jul-26"
}

export function TrainingMatrixHeader({ periodLabel }: TrainingMatrixHeaderProps) {
  return (
    <View fixed>
      <View style={s.headerBox}>
        <View style={s.row}>
          <View style={s.logoCell}>
            <Image style={s.logoImage} src={getLogoDataUri()} />
          </View>
          <View style={s.companyNameCell}>
            <Text style={s.companyName}>QbD Research and Development Lab.Pvt.Ltd</Text>
          </View>
        </View>

        <View style={s.row}>
          <Text style={{ flex: 1, textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 11, padding: 6 }}>
            TRAINING MATRIX TO TRACK TRAINING OF EMPLOYEES-{periodLabel}
          </Text>
        </View>

        <View style={s.rowLast}>
          <View style={[s.cellLast, { flex: 1 }]}>
            <Text style={s.label}>Reference SOP No.: {REFERENCE_SOP_NO}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
