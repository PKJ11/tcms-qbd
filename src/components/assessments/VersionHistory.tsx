'use client'

import { useEffect, useState } from 'react'
import { filledOptions } from '@/modules/assessment/schema'

interface VersionListItem {
  id:               string
  versionNo:        number
  versionLabel:     string
  basedOnVersionId: string | null
  createdAt:        string
  createdBy:        { id: string; name: string }
  _count:           { questions: number }
}

interface VersionQuestions {
  id:           string
  versionNo:    number
  versionLabel: string
  questions: {
    id:            string
    questionText:  string
    optionA:       string
    optionB:       string
    optionC:       string | null
    optionD:       string | null
    correctAnswer: string
    isActive:      boolean
  }[]
}

export function VersionHistory({ bankId }: { bankId: string }) {
  const [versions, setVersions] = useState<VersionListItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detail,   setDetail]   = useState<VersionQuestions | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/assessments/banks/${bankId}/versions`)
      .then((res) => res.json())
      .then((data) => setVersions(data.versions ?? []))
      .finally(() => setLoading(false))
  }, [bankId])

  async function toggleExpand(versionId: string) {
    if (expanded === versionId) {
      setExpanded(null)
      setDetail(null)
      return
    }
    setExpanded(versionId)
    setDetail(null)
    setDetailLoading(true)
    const res  = await fetch(`/api/assessments/banks/${bankId}/versions/${versionId}`)
    const data = await res.json()
    setDetailLoading(false)
    if (res.ok) setDetail(data.version)
  }

  if (loading) return null
  if (versions.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e5e7eb' }}>
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Version history</h2>
      <div className="flex flex-col gap-2">
        {versions.map((v) => (
          <div key={v.id} className="rounded-lg border" style={{ borderColor: '#f3f4f6' }}>
            <button
              onClick={() => toggleExpand(v.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <span className="text-sm font-medium text-gray-900">v{v.versionNo} — {v.versionLabel}</span>
                <span className="text-xs text-gray-400 ml-2">{v._count.questions} questions · by {v.createdBy.name}</span>
              </div>
              <span className="text-xs text-gray-400">{new Date(v.createdAt).toLocaleDateString('en-IN')}</span>
            </button>

            {expanded === v.id && (
              <div className="px-4 pb-4">
                {detailLoading && <p className="text-xs text-gray-400">Loading questions...</p>}
                {detail && (
                  <div className="flex flex-col gap-2 mt-2">
                    {detail.questions.map((q, i) => (
                      <div
                        key={q.id}
                        className="p-3 rounded-lg text-sm"
                        style={{ background: q.isActive ? '#f9fafb' : '#fef2f2', opacity: q.isActive ? 1 : 0.7 }}
                      >
                        <div className="font-medium text-gray-900 mb-1">
                          {i + 1}. {q.questionText}
                          {!q.isActive && <span className="ml-2 text-xs" style={{ color: '#dc2626' }}>(archived at this version)</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                          {filledOptions(q).map(({ letter, text }) => (
                            <div
                              key={letter}
                              className={q.correctAnswer === letter ? 'font-semibold' : ''}
                              style={{ color: q.correctAnswer === letter ? '#166534' : undefined }}
                            >
                              {letter}. {text}
                              {q.correctAnswer === letter && ' ✓'}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
