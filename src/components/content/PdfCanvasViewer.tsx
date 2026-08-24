'use client'

import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface Props {
  url:         string
  fullscreen?: boolean
}

// Renders a PDF page-by-page onto <canvas> instead of handing it to the
// browser's native PDF plugin. The native plugin (used by a plain <iframe>)
// carries its own print/download/save-as context menu that page-level JS
// cannot reach or suppress — canvas has none of that, and there's no text
// layer to select/copy either.
export function PdfCanvasViewer({ url, fullscreen = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let pdfDoc: PDFDocumentProxy | null = null

    async function render() {
      setLoading(true)
      setError(null)

      const pdfjsLib = await import('pdfjs-dist')
      // Served as a static asset from public/ (see scripts/copy-pdf-worker.js)
      // rather than bundled via `new URL(..., import.meta.url)` — webpack/SWC
      // fails to parse pdfjs-dist's worker .mjs (ESM-only since pdfjs-dist v4).
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

      pdfDoc = await pdfjsLib.getDocument(url).promise
      if (cancelled) return

      const container = containerRef.current
      if (!container) return
      container.innerHTML = ''

      for (let pageNo = 1; pageNo <= pdfDoc.numPages; pageNo++) {
        if (cancelled) return
        const page     = await pdfDoc.getPage(pageNo)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas   = document.createElement('canvas')
        const ctx      = canvas.getContext('2d')
        if (!ctx) continue

        canvas.width  = viewport.width
        canvas.height = viewport.height
        canvas.style.display  = 'block'
        canvas.style.margin   = '0 auto 12px'
        canvas.style.maxWidth = '100%'
        canvas.style.height   = 'auto'
        canvas.style.boxShadow = '0 1px 3px rgba(0,0,0,0.15)'

        await page.render({ canvasContext: ctx, viewport }).promise
        if (cancelled) return
        container.appendChild(canvas)
      }

      setLoading(false)
    }

    render().catch((err) => {
      if (cancelled) return
      setError(err instanceof Error ? err.message : 'Could not load this file.')
      setLoading(false)
    })

    return () => {
      cancelled = true
      pdfDoc?.destroy()
    }
  }, [url])

  return (
    <div
      className="relative overflow-auto select-none"
      style={{ maxHeight: fullscreen ? '90vh' : '65vh' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {loading && (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading material...
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          {error}
        </div>
      )}
      <div ref={containerRef} />
    </div>
  )
}
