import { StyleSheet } from '@react-pdf/renderer'

export const BRAND_GREEN = '#2d6a4f'
export const BORDER      = '#000000'

export const letterheadStyles = StyleSheet.create({
  page: {
    paddingTop:    24,
    paddingBottom: 32,
    paddingHorizontal: 24,
    fontSize:  8,
    fontFamily: 'Helvetica',
  },

  headerBox: {
    borderWidth: 1,
    borderColor: BORDER,
  },

  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rowLast: {
    flexDirection: 'row',
  },

  cell: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: 'center',
  },
  cellLast: {
    padding: 4,
    justifyContent: 'center',
  },

  logoCell: {
    width: 130,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  logoImage: {
    width: 100,
  },

  companyNameCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  companyName: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },

  formatBar: {
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    padding: 4,
  },

  label: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  value: {
    fontSize: 8,
  },

  signBlock: {
    lineHeight: 1.6,
  },

  contextLine: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },

  kvGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 4,
  },
  kvItem: {
    width: '50%',
    padding: 5,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  kvLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#555555',
  },
  kvValue: {
    fontSize: 8.5,
    marginTop: 1,
  },

  table: {
    marginTop: 6,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#e9ece9',
    borderWidth: 1,
    borderColor: BORDER,
  },
  tableHeaderCell: {
    padding: 4,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  tableRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  tableCell: {
    padding: 4,
    fontSize: 7.5,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
})
