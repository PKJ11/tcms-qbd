// Dedicated header for the Training Attendance Record PDF — deliberately
// NOT sharing implementation with the other reports' headers (see
// TrainingIndexHeader.tsx / TrainingMatrixHeader.tsx), modelled on the
// physical "TRAINING ATTENDANCE RECORD" sign-in sheet.
import { View, Text, Image } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'
import { getLogoDataUri } from './logo'

export interface TrainingAttendanceHeaderProps {
  topicName:    string
  documentNo:   string
  versionNo:    string
  trainerName:  string
  dateLabel:    string
}

export function TrainingAttendanceHeader({
  topicName, documentNo, versionNo, trainerName, dateLabel,
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

        <View style={s.row}>
          <View style={[s.cell, { flex: 2 }]}>
            <Text style={s.label}>Name of the Trainer: {trainerName}</Text>
          </View>
          <View style={[s.cellLast, { flex: 1 }]}>
            <Text style={s.label}>Version No.: {versionNo}</Text>
          </View>
        </View>

        <View style={s.rowLast}>
          <View style={[s.cell, { flex: 2 }]}>
            <Text style={s.label}>Time: From _____ Hrs. to _____ Hrs.</Text>
          </View>
          <View style={[s.cell, { flex: 1 }]}>
            <Text style={s.label}>Date of Training: {dateLabel}</Text>
          </View>
          <View style={[s.cellLast, { flex: 1 }]}>
            <Text style={s.label}>Venue: </Text>
          </View>
        </View>
      </View>
    </View>
  )
}
