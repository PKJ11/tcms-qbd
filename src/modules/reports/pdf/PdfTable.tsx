import { View, Text } from '@react-pdf/renderer'
import { letterheadStyles as s } from './styles'

export interface PdfTableColumn {
  key:    string
  header: string
  width:  number | string
}

export function PdfTable({ columns, rows }: { columns: PdfTableColumn[]; rows: Record<string, string>[] }) {
  return (
    <View style={s.table}>
      <View style={s.tableHeaderRow} fixed>
        {columns.map((col, i) => (
          <Text
            key={col.key}
            style={[
              s.tableHeaderCell,
              { width: col.width },
              i === columns.length - 1 ? { borderRightWidth: 0 } : {},
            ]}
          >
            {col.header}
          </Text>
        ))}
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
