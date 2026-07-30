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

  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    fetch(`/api/assignments/${assignmentId}/view`, { method: 'POST' })
  }, [assignmentId])

  async function handleConfirm() {
    setConfirming(true)
    await fetch(`/api/assignments/${assignmentId}/materials/${material.id}/confirm`, { method: 'POST' })
    setConfirming(false)
    onConfirmed()
  }

  const showConfirm = trainingType !== 'ACKNOWLEDGEMENT_ONLY'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-xl flex flex-col"
        style={{ border: '1px solid #e5e7eb', maxHeight: '85vh' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #f3f4f6' }}
        >
          <h3 className="text-base font-semibold text-gray-900">{material.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4" style={{ minHeight: '400px' }}>
          <MaterialPreview materialId={material.id} versionId={version.id} />
        </div>

        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
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
