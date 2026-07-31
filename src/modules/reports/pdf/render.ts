import { renderToBuffer } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

export async function renderReportPdf(doc: ReactElement): Promise<Blob> {
  const buffer = await renderToBuffer(doc)
  const bytes  = new Uint8Array(buffer.length)
  bytes.set(buffer)
  return new Blob([bytes], { type: 'application/pdf' })
}
