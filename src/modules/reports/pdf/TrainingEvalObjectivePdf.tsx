import { Document, Page, View, Text } from '@react-pdf/renderer'
import { letterheadStyles as s, BORDER } from './styles'
import { Letterhead } from './Letterhead'
import type { TrainingEvalObjectiveData } from '../types'

// Physical form: QbD/QA/F/007-05, Ver. No. 05, Reference SOP QbD-QA-SOP-007.
const FORMAT_NO     = 'QbD/QA/F/007-05'
const VERSION_NO    = '05'
const REPLACES      = 'QbD/QA/F/007-05, V.04'
const EFFECTIVE_ON  = '07-Jul-23'
const REVIEW_ON     = '06-Jul-26'
const REFERENCE_SOP = 'Reference SOP No.: QbD-QA-SOP-007'
const IPR_LINE      =
  'The document is covered under IPR of QbD and should not be reproduced without authorization.'
const NOTE_TEXT =
  'If % marks are below 80 %, the trainer should clear out doubts or elaborate the subject in a way by which specific trainee should understand the subject clearly to reach the 100 % marks. Each question carries equal marks.'

const box = {
  borderWidth: 1,
  borderColor: BORDER,
  borderTopWidth: 0,
}

// An empty answer box — the built-in fonts have no check glyph and this
// sheet is printed blank anyway, so it is just a small square outline.
function CheckBox() {
  return <View style={{ width: 9, height: 9, borderWidth: 1, borderColor: BORDER, marginRight: 4, marginTop: 1 }} />
}

function Option({ letter, text }: { letter: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', width: '50%', paddingRight: 6, marginBottom: 3 }}>
      <CheckBox />
      <Text style={{ fontSize: 8 }}>{letter}) {text}</Text>
    </View>
  )
}

export function TrainingEvalObjectivePdf({
  data, preparedByName, preparedDate,
}: {
  data:           TrainingEvalObjectiveData
  preparedByName: string
  preparedDate:   string
}) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Letterhead
          title="TRAINING EVALUATION SHEET FOR OBJECTIVE QUESTIONS"
          formatNo={FORMAT_NO}
          versionNo={VERSION_NO}
          replaces={REPLACES}
          effectiveOn={EFFECTIVE_ON}
          reviewOn={REVIEW_ON}
          department="Quality Assurance"
          preparedByName={preparedByName}
          preparedDate={preparedDate}
          preparedByTitle="Executive - II QA"
          contextLine={REFERENCE_SOP}
        />

        {/* Trainee / Employee No. band */}
        <View style={{ borderTopWidth: 1, borderColor: BORDER, marginTop: 8 }}>
          <View style={[box, { flexDirection: 'row' }]}>
            <View style={{ flex: 3, padding: 4, borderRightWidth: 1, borderColor: BORDER }}>
              <Text style={s.label}>Name, Sign and Date of Trainee</Text>
              <Text style={{ marginTop: 12 }}> </Text>
            </View>
            <View style={{ flex: 1, padding: 4 }}>
              <Text style={s.label}>Employee No.</Text>
            </View>
          </View>
          <View style={[box, { flexDirection: 'row' }]}>
            <Text style={[s.label, { padding: 4 }]}>Topic: </Text>
            <Text style={{ padding: 4, fontSize: 8 }}>{data.topicName}</Text>
          </View>
        </View>

        {/* Questions */}
        {data.questions.length === 0 ? (
          <View style={[box, { padding: 6 }]}>
            <Text style={s.value}>
              This topic has no objective questions in its current question-bank version.
            </Text>
          </View>
        ) : (
          data.questions.map((q, i) => {
            const opts: { letter: string; text: string }[] = [
              { letter: 'a', text: q.optionA },
              { letter: 'b', text: q.optionB },
            ]
            if (q.optionC) opts.push({ letter: 'c', text: q.optionC })
            if (q.optionD) opts.push({ letter: 'd', text: q.optionD })

            return (
              <View key={i} style={[box, { padding: 4 }]} wrap={false}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>
                  Q{i + 1}. {q.questionText}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingLeft: 10 }}>
                  {opts.map((o) => (
                    <Option key={o.letter} letter={o.letter} text={o.text} />
                  ))}
                </View>
              </View>
            )
          })
        )}

        {/* Marks / Checked By band */}
        <View style={[box, { flexDirection: 'row' }]}>
          <View style={{ flex: 1, padding: 4, borderRightWidth: 1, borderColor: BORDER }}>
            <Text style={s.label}>Marks:</Text>
          </View>
          <View style={{ flex: 1, padding: 4 }}>
            <Text style={s.label}>Checked By (Sign / Date):</Text>
          </View>
        </View>

        <Text style={{ fontSize: 7, marginTop: 6 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Note: </Text>{NOTE_TEXT}
        </Text>

        <Text style={{ fontSize: 7, marginTop: 16, textAlign: 'center' }}>{IPR_LINE}</Text>
        <Text style={[s.label, { marginTop: 8 }]}>Format No. {FORMAT_NO}</Text>
      </Page>
    </Document>
  )
}
