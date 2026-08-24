'use client'

import { useState, useEffect } from 'react'
import { MaterialPreview } from '@/components/content/MaterialPreview'

interface MaterialVersion {
  id:       string
  fileType: string
  fileUrl:  string
}

interface Material {
  id:       string
  title:    string
  versions: MaterialVersion[]
}

interface Props {
  assignmentId: string
  material:     Material
  trainingType: string
  onClose:      () => void
  onConfirmed:  () => void
}

export function MaterialViewerModal({ assignmentId, material, trainingType, onClose, onConfirmed }: Props) {
  const version = material.versions[0]

  const [confirming,  setConfirming]  = useState(false)
  const [fullscreen,  setFullscreen]  = useState(false)

  useEffect(() => {
    fetch(`/api/assignments/${assignmentId}/view`, { method: 'POST' })
  }, [assignmentId])

  // Best-effort deterrent: swallow Ctrl/Cmd+P while the material is open so
  // the browser's print dialog doesn't hand out a savable copy. This can't
  // catch the shortcut while focus is inside the PDF's own iframe — the
  // hidden native toolbar (see MaterialPreview) is the other half of this.
  // Escape backs out of fullscreen first, then closes the modal — same as
  // most viewers (image lightboxes, PDF apps, video players).
  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      if (e.key === 'Escape') {
        if (fullscreen) setFullscreen(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKeydown, true)
    return () => window.removeEventListener('keydown', onKeydown, true)
  }, [fullscreen, onClose])

  async function handleConfirm() {
    setConfirming(true)
    await fetch(`/api/assignments/${assignmentId}/materials/${material.id}/confirm`, { method: 'POST' })
    setConfirming(false)
    onConfirmed()
  }

  const showConfirm = trainingType !== 'ACKNOWLEDGEMENT_ONLY'

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${fullscreen ? '' : 'px-4'}`}
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !fullscreen) onClose() }}
    >
      <style>{'@media print { body * { display: none !important; } }'}</style>
      <div
        className={
          fullscreen
            ? 'w-screen h-screen bg-white flex flex-col'
            : 'w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col'
        }
        style={fullscreen ? undefined : { border: '1px solid #e5e7eb', maxHeight: '90vh' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid #f3f4f6' }}
        >
          <h3 className="text-base font-semibold text-gray-900 truncate pr-4">{material.title}</h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setFullscreen((v) => !v)}
              title={fullscreen ? 'Exit full screen' : 'Full screen'}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {fullscreen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 01-2 2H3"/>
                  <path d="M21 8h-3a2 2 0 01-2-2V3"/>
                  <path d="M3 16h3a2 2 0 012 2v3"/>
                  <path d="M16 21v-3a2 2 0 012-2h3"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 00-2 2v3"/>
                  <path d="M16 3h3a2 2 0 012 2v3"/>
                  <path d="M3 16v3a2 2 0 002 2h3"/>
                  <path d="M21 16v3a2 2 0 01-2 2h-3"/>
                </svg>
              )}
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4" style={{ minHeight: fullscreen ? undefined : '400px' }}>
          <MaterialPreview materialId={material.id} versionId={version.id} fullscreen={fullscreen} />
        </div>

        <div
          className="flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #f3f4f6' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}
          >
            Close
          </button>
          {showConfirm && (
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ background: '#16a34a' }}
            >
              {confirming ? 'Confirming...' : 'Confirmed'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
