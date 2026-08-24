'use client'

import { useState, useEffect } from 'react'
import { PdfCanvasViewer } from './PdfCanvasViewer'

interface Props {
  materialId:  string
  versionId:   string
  fullscreen?: boolean
}

type Preview =
  | { kind: 'pdf' | 'video' | 'external'; url: string }
  | { kind: 'html'; html: string }

export function MaterialPreview({ materialId, versionId, fullscreen = false }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      const res  = await fetch(`/api/content/${materialId}/versions/${versionId}/preview`)
      const data = await res.json()
      if (cancelled) return
      if (!res.ok) {
        setError(data.message ?? 'Could not load this material.')
      } else {
        setPreview(data)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [materialId, versionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        Loading material...
      </div>
    )
  }

  if (error || !preview) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        {error ?? 'Could not load this material.'}
      </div>
    )
  }

  if (preview.kind === 'pdf') {
    return <PdfCanvasViewer url={preview.url} fullscreen={fullscreen} />
  }

  if (preview.kind === 'video') {
    return (
      <video
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        src={preview.url}
        className="w-full h-full"
        style={{ maxHeight: fullscreen ? 'none' : '480px' }}
      />
    )
  }

  if (preview.kind === 'html') {
    return (
      <div
        className="overflow-auto select-none text-sm text-gray-800 [&_table]:border-collapse [&_td]:border [&_td]:border-gray-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-gray-200 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-gray-50 [&_p]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2"
        style={{ maxHeight: fullscreen ? '90vh' : '65vh', WebkitUserSelect: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        dangerouslySetInnerHTML={{ __html: preview.html }}
      />
    )
  }

  // 'external' — shouldn't normally be reached inside the modal since
  // callers open these outside instead, but keep a safe fallback.
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-sm text-gray-500">
      <p>Preview isn&apos;t available for this file type.</p>
      <a
        href={preview.url}
        target="_blank"
        rel="noreferrer"
        className="px-4 py-2 rounded-lg text-sm font-medium text-white"
        style={{ background: '#2d6a4f' }}
      >
        Open file
      </a>
    </div>
  )
}
