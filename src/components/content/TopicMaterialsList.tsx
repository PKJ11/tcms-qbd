'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'

interface Material {
  id:             string
  title:          string
  currentVersion: number
  status:         string
}

interface Props {
  topicId:   string
  materials: Material[]
  canEdit:   boolean
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  APPROVED: { bg: '#f0fdf4', color: '#166534' },
  RETIRED:  { bg: '#f9fafb', color: '#6b7280' },
  DRAFT:    { bg: '#fefce8', color: '#854d0e' },
}

export function TopicMaterialsList({ topicId, materials, canEdit }: Props) {
  const router = useRouter()
  const [archiveTarget, setArchiveTarget] = useState<Material | null>(null)
  const [loading,       setLoading]       = useState(false)

  async function handleArchive(justification: string) {
    if (!archiveTarget) return
    setLoading(true)

    await fetch(`/api/content/${archiveTarget.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'retire', justification }),
    })

    setLoading(false)
    setArchiveTarget(null)
    router.refresh()
  }

  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p className="text-sm text-gray-400">No materials uploaded yet</p>
        {canEdit && (
          <a
            href={`/content/upload?topicId=${topicId}`}
            className="text-xs font-medium mt-1"
            style={{ color: '#2d6a4f' }}
          >
            Upload the first material →
          </a>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {materials.map((material) => {
          const statusStyle = STATUS_STYLE[material.status] ?? STATUS_STYLE.DRAFT

          return (
            <div
              key={material.id}
              className="flex items-center justify-between p-3 rounded-lg border"
              style={{ borderColor: '#f3f4f6', background: '#fafafa' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#f0fdf4' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {material.title}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    v{material.currentVersion} &nbsp;·&nbsp;
                    <span
                      className="px-1.5 py-0.5 rounded text-xs font-semibold"
                      style={statusStyle}
                    >
                      {material.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/content?topicId=${topicId}`}
                  className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                  style={{ borderColor: '#e5e7eb', color: '#374151' }}
                >
                  View
                </a>
                {canEdit && material.status !== 'RETIRED' && (
                  <button
                    onClick={() => setArchiveTarget(material)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                    style={{ borderColor: '#fecaca', color: '#dc2626' }}
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <JustificationModal
        isOpen={!!archiveTarget}
        title={`Archive "${archiveTarget?.title ?? ''}"`}
        description="This material will be retired and no longer available for new assignments."
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
        loading={loading}
      />
    </>
  )
}
