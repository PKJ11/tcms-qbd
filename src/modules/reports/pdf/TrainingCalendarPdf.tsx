import { Document, Page, View, Text, Svg, Polyline } from '@react-pdf/renderer'
import { letterheadStyles as s, BORDER } from './styles'
import { Letterhead } from './Letterhead'
import { PdfFooter } from './PdfFooter'
import type { TrainingCalendarData } from '../types'

// Physical form: QbD/QA/F/007-03, Ver. No. 08.
const FORMAT_NO       = 'QbD/QA/F/007-03'
const VERSION_NO      = '08'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const SR_W    = '6%'
const TITLE_W = '28%'
const MONTH_W = '5.5%' // 12 × 5.5 = 66%

const cell = {
  borderRightWidth: 1,
  borderRightColor: BORDER,
  borderBottomWidth: 1,
  borderBottomColor: BORDER,
  padding: 3,
  fontSize: 7.5,
  justifyContent: 'center' as const,
}

// A tick drawn with vector strokes — the built-in Helvetica font has no
// check glyph, so a Unicode ✓ would come out blank (which is why an "X"
// was used before). This renders a real checkmark.
function Tick() {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={9} height={9} viewBox="0 0 24 24">
        <Polyline
          points="20 6 9 17 4 12"
          stroke="#000000"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  )
}

export function TrainingCalendarPdf({
  data, preparedByName, preparedDate,
}: {
  data:           TrainingCalendarData
  preparedByName: string
  preparedDate:   string
}) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Letterhead
          title="TRAINING CALENDAR"
          formatNo={FORMAT_NO}
          department="All Departments"
          preparedByName={preparedByName}
          preparedDate={preparedDate}
          showControlledMeta={false}
        />

        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 6 }}>
          TRAINING CALENDAR
        </Text>
        <Text style={[s.label, { marginBottom: 6 }]}>Year: {data.year}</Text>

        <View style={{ borderTopWidth: 1, borderTopColor: BORDER, borderLeftWidth: 1, borderLeftColor: BORDER }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', backgroundColor: '#e9ece9' }} fixed>
            <Text style={[cell, { width: SR_W, fontFamily: 'Helvetica-Bold' }]}>Sr. No.</Text>
            <Text style={[cell, { width: TITLE_W, fontFamily: 'Helvetica-Bold' }]}>Topic of Training</Text>
            {MONTHS.map((m) => (
              <Text key={m} style={[cell, { width: MONTH_W, fontFamily: 'Helvetica-Bold', textAlign: 'center' }]}>{m}</Text>
            ))}
          </View>

          {data.rows.length === 0 ? (
            <View style={{ flexDirection: 'row' }}>
              <Text style={[cell, { width: '100%', borderRightWidth: 0 }]}>
                No trainings have been added to the calendar yet.
              </Text>
            </View>
          ) : (
            data.rows.map((row, i) => (
              <View key={row.id} style={{ flexDirection: 'row' }} wrap={false}>
                <Text style={[cell, { width: SR_W, textAlign: 'center' }]}>{i + 1}.</Text>
                <Text style={[cell, { width: TITLE_W }]}>{row.title}</Text>
                {row.months.map((on, mi) => (
                  <View key={mi} style={[cell, { width: MONTH_W, alignItems: 'center' }]}>
                    {on ? <Tick /> : null}
                  </View>
                ))}
              </View>
            ))
          )}
        </View>

        <PdfFooter printedByName={preparedByName} formatNo={FORMAT_NO} versionNo={VERSION_NO} />
      </Page>
    </Document>
  )
}
