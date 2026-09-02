// Dedicated header for the Training Attendance Record PDF — deliberately
// NOT sharing implementation with the other reports' headers (see
// TrainingIndexHeader.tsx / TrainingMatrixHeader.tsx), modelled on the
// physical "TRAINING ATTENDANCE RECORD" sign-in sheet.
import { View, Text, Image } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { getLogoDataUri } from './logo'

export interface TrainingAttendanceHeaderProps {
  topicName:   string
  documentNo:  string
  trainerName: string
}

export function TrainingAttendanceHeader({
  topicName, documentNo, trainerName,
}: TrainingAttendanceHeaderProps) {
  return (
    <View fixed>
      <View style={s.headerBox}>
        <View style={s.row}>
          <View style={s.logoCell}>
            <Image style={s.logoImage} src={getLogoDataUri()} />
          </View>
          <View style={[s.companyNameCell, { flex: 2 }]}>
            <Text style={s.companyName}>TRAINING ATTENDANCE RECORD</Text>
          </View>
          <View style={[s.cellLast, { flex: 1 }]}>
            <Text style={s.value}>QbD Research and Development Lab Pvt. Ltd.</Text>
            <Text style={s.value}>007</Text>
          </View>
        </View>

        <View style={s.row}>
          <View style={[s.cellLast, { flex: 1 }]}>
            <Text style={s.label}>Topic of Training: {topicName}</Text>
          </View>
        </View>

        <View style={s.row}>
          <View style={[s.cellLast, { flex: 1 }]}>
            <Text style={s.label}>Document No.: {documentNo}</Text>
          </View>
        </View>

        <View style={s.rowLast}>
          <View style={[s.cellLast, { flex: 1 }]}>
            <Text style={s.label}>Name of the Trainer: {trainerName}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
