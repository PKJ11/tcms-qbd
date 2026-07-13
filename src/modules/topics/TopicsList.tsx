'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'
import { JustificationModal } from '@/components/JustificationModal'

interface TopicScope {
  department: { id: string; name: string }
  unit:       { id: string; name: string } | null
  section:    { id: string; name: string } | null
}

interface Topic {
  id:           string
  name:         string
  description:  string | null
  trainingType: string
  isActive:     boolean
  createdAt:    string
  createdBy:    { id: string; name: string }
  topicScopes:  TopicScope[]
  _count:       { assignments: number; materials: number }
}

export function TopicsList({ canCreate }: { canCreate: boolean }) {
  const [topics,           setTopics]           = useState<Topic[]>([])
  const [loading,          setLoading]          = useState(true)
  const [search,           setSearch]           = useState('')
  const [showInactive,     setShowInactive]     = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<Topic | null>(null)
  const [modalLoading,     setModalLoading]     = useState(false)

  const fetchTopics = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      isActive: showInactive ? 'false' : 'true',
      ...(search ? { search } : {}),
    })
    const res  = await fetch(`/api/topics?${params}`)
    const data = await res.json()
    setTopics(data.topics ?? [])
    setLoading(false)
  }, [search, showInactive])

  useEffect(() => { fetchTopics() }, [fetchTopics])

  async function handleDeactivate(justification: string) {
    if (!deactivateTarget) return
    setModalLoading(true)

    await fetch(`/api/topics/${deactivateTarget.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'deactivate', justification }),
    })

    setModalLoading(false)
    setDeactivateTarget(null)
    fetchTopics()
  }

  return (
    <>
      {/* Filters */}
      <div
        className="bg-white rounded-xl border p-4 mb-4 flex flex-wrap gap-3"
        style={{ borderColor: '#e5e7eb' }}
      >
        <div className="relative flex-1 min-w-48">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            width="15" height="15"
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: '#e5e7eb' }}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 accent-green-700"
          />
          Show inactive
        </label>

        <div className="ml-auto text-sm text-gray-400 self-center">
          {topics.length} topic{topics.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Topic cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading topics...
        </div>
      ) : topics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
          </svg>
          <p className="text-sm text-gray-400">No topics found</p>
          {canCreate && (
            <a
              href="/topics/new"
              className="text-sm font-medium"
              style={{ color: '#2d6a4f' }}
            >
              Add the first topic →
            </a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="bg-white rounded-xl border p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
              style={{ borderColor: '#e5e7eb' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {topic.name}
                  </h3>
                  {topic.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {topic.description}
                    </p>
                  )}
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                  style={
                    topic.isActive
                      ? { background: '#f0fdf4', color: '#166534' }
                      : { background: '#fef2f2', color: '#dc2626' }
                  }
                >
                  {topic.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Training type */}
              <span
                className="self-start px-2 py-0.5 rounded text-xs font-semibold"
                style={{ background: '#fefce8', color: '#854d0e' }}
              >
                {topic.trainingType.replace(/_/g, ' ')}
              </span>

              {/* Scopes */}
              <div className="flex flex-wrap gap-1.5">
                {topic.topicScopes.length === 0 ? (
                  <span className="text-xs text-gray-400">No scope assigned</span>
                ) : (
                  topic.topicScopes.map((ts, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{ background: '#eff6ff', color: '#1d4ed8' }}
                    >
                      {ts.department.name}
                      {ts.unit ? ` → ${ts.unit.name}` : ''}
                      {ts.section ? ` → ${ts.section.name}` : ''}
                    </span>
                  ))
                )}
              </div>

              {/* Stats */}
              <div
                className="flex items-center gap-4 pt-2 text-xs text-gray-400"
                style={{ borderTop: '1px solid #f3f4f6' }}
              >
                <span>{topic._count.materials} material{topic._count.materials !== 1 ? 's' : ''}</span>
                <span>{topic._count.assignments} assignment{topic._count.assignments !== 1 ? 's' : ''}</span>
                <span className="ml-auto">{formatDate(topic.createdAt)}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <a
                  href={`/topics/${topic.id}`}
                  className="flex-1 text-center py-1.5 rounded-lg border text-xs font-medium transition-colors"
                  style={{ borderColor: '#e5e7eb', color: '#374151' }}
                >
                  View details
                </a>
                {canCreate && topic.isActive && (
                  <button
                    onClick={() => setDeactivateTarget(topic)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                    style={{ borderColor: '#fecaca', color: '#dc2626' }}
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <JustificationModal
        isOpen={!!deactivateTarget}
        title={`Deactivate "${deactivateTarget?.name ?? ''}"`}
        description="This topic will no longer be assignable. Existing assignments are not affected."
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
        loading={modalLoading}
      />
    </>
  )
}