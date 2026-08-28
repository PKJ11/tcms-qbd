import { View, Text } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'

export interface PdfTableColumn {
  key:    string
  header: string
  width:  number | string
  // Optional second line under the header (e.g. a topic's SOP reference) —
  // when present, the header cell renders as two stacked lines instead of
  // the plain single-line label every other caller uses.
  subHeader?: string
}

export function PdfTable({ columns, rows }: { columns: PdfTableColumn[]; rows: Record<string, string>[] }) {
  return (
    <View style={s.table}>
      <View style={s.tableHeaderRow} fixed>
        {columns.map((col, i) => {
          const cellStyle = [
            s.tableHeaderCell,
            { width: col.width },
            i === columns.length - 1 ? { borderRightWidth: 0 } : {},
          ]
          if (!col.subHeader) {
            return <Text key={col.key} style={cellStyle}>{col.header}</Text>
          }
          return (
            <View key={col.key} style={[...cellStyle, { flexDirection: 'column' }]}>
              <Text>{col.header}</Text>
              <Text style={{ fontFamily: 'Helvetica', fontWeight: 'normal', marginTop: 2 }}>{col.subHeader}</Text>
            </View>
          )
        })}
      </View>

      {rows.map((row, r) => (
        <View key={r} style={s.tableRow} wrap={false}>
          {columns.map((col, i) => (
            <Text
              key={col.key}
              style={[
                s.tableCell,
                { width: col.width },
                i === columns.length - 1 ? { borderRightWidth: 0 } : {},
              ]}
            >
              {row[col.key] ?? ''}
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}
