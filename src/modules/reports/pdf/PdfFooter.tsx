// Shared controlled-print footer for every report PDF. Rendered `fixed` so
// it repeats on every page:
//   • left  — Printed By : <user>, Printed On : <DD-Mon-YY HH:mm> (24-hour)
//   • right — Format No. <format number>  Ver. No. <version> (version optional)
import { View, Text } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "22-May-26 17:01" — date as DD-Mon-YY, time as 24-hour HH:mm.
function formatPrintedOn(d: Date): string {
  const dd  = String(d.getDate()).padStart(2, '0')
  const mon = MONTHS[d.getMonth()]
  const yy  = String(d.getFullYear()).slice(-2)
  const hh  = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}-${mon}-${yy} ${hh}:${min}`
}

export function PdfFooter({
  printedByName,
  formatNo,
  versionNo,
}: {
  printedByName: string
  formatNo:      string
  versionNo?:    string
}) {
  const printedOn  = formatPrintedOn(new Date())
  const rightText  = versionNo
    ? `Format No. ${formatNo} Ver. No. ${versionNo}`
    : `Format No. ${formatNo}`

  return (
    <View style={s.footer} fixed>
      <Text style={[s.footerText, { flex: 1 }]}>
        Printed By : {printedByName}, Printed On : {printedOn}
      </Text>
      <Text style={[s.footerText, { flex: 1, textAlign: 'right' }]}>{rightText}</Text>
    </View>
  )
}
