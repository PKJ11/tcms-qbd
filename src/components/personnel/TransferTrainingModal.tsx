'use client'

import { useEffect, useState } from 'react'

interface LastAssignment {
  status:      string
  trigger:     string
  dueDate:     string
  completedAt: string | null
  createdAt:   string
}

interface ScopedTraining {
  topicId:        string
  name:           string
  defaultChecked: boolean
  badge:          'completed' | 'active' | null
  lastAssignment: LastAssignment | null
}

interface HistoryItem {
  id:          string
  topicName:   string
  status:      string
  trigger:     string
  dueDate:     string
  completedAt: string | null
  assignedBy:  string
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  COMPLETED:   { bg: '#f0fdf4', color: '#166534' },
  FAILED:      { bg: '#fef2f2', color: '#dc2626' },
  OVERDUE:     { bg: '#fef2f2', color: '#dc2626' },
  CANCELLED:   { bg: '#f3f4f6', color: '#6b7280' },
  IN_PROGRESS: { bg: '#eff6ff', color: '#1d4ed8' },
  NOT_STARTED: { bg: '#f3f4f6', color: '#374151' },
}

interface Props {
  isOpen:              boolean
  personId:            string
  targetDepartmentId:  string
  targetUnitId:        string
  targetSectionId:     string
  onContinue:          (selectedTopicIds: string[], dueDate: string) => void
  onCancel:            () => void
}

function defaultDueDate() {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
}

export function TransferTrainingModal({
  isOpen,
  personId,
  targetDepartmentId,
  targetUnitId,
  targetSectionId,
  onContinue,
  onCancel,
}: Props) {
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [trainings, setTrainings] = useState<ScopedTraining[]>([])
  const [history, setHistory]     = useState<HistoryItem[]>([])
  const [selected, setSelected]   = useState<Record<string, boolean>>({})
  const [dueDate, setDueDate]     = useState(defaultDueDate())

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setDueDate(defaultDueDate())

    async function fetchTrainings() {
      const params = new URLSearchParams({
        departmentId: targetDepartmentId,
        unitId:       targetUnitId,
        ...(targetSectionId && { sectionId: targetSectionId }),
      })
      const res  = await fetch(`/api/personnel/${personId}/scoped-trainings?${params}`)
      const data = await res.json()

      if (cancelled) return

      if (!res.ok) {
        setError(data.message ?? 'Failed to load fixed trainings for this placement.')
        setLoading(false)
        return
      }

      const list: ScopedTraining[] = data.trainings ?? []
      setTrainings(list)
      setSelected(
        Object.fromEntries(list.map((t) => [t.topicId, t.defaultChecked]))
      )
      setHistory(data.history ?? [])
      setLoading(false)
    }

    fetchTrainings()
    return () => { cancelled = true }
  }, [isOpen, personId, targetDepartmentId, targetUnitId, targetSectionId])

  function toggle(topicId: string) {
    setSelected((prev) => ({ ...prev, [topicId]: !prev[topicId] }))
  }

  function handleContinue() {
    const selectedIds = trainings
      .filter((t) => selected[t.topicId])
      .map((t) => t.topicId)
    onContinue(selectedIds, dueDate)
  }

  if (!isOpen) return null

  const selectedCount = trainings.filter((t) => selected[t.topicId]).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[85vh] flex flex-col"
        style={{ border: '1px solid #e5e7eb' }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
          <h3 className="text-base font-semibold text-gray-900">
            Fixed trainings for this placement
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            This department/unit{targetSectionId ? '/section' : ''} has compulsory trainings.
            Choose which ones to assign now.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {loading && (
            <p className="text-sm text-gray-500 py-6 text-center">Loading fixed trainings…</p>
          )}

          {!loading && error && (
            <div
              className="text-sm px-4 py-3 rounded-lg border"
              style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}
            >
              {error}
            </div>
          )}

          {!loading && !error && trainings.length === 0 && (
            <p className="text-sm text-gray-500 py-6 text-center">
              No fixed trainings apply to this department/unit/section.
            </p>
          )}

          {!loading && !error && trainings.length > 0 && (
            <>
              <div className="flex flex-col gap-2 mb-4">
                {trainings.map((t) => (
                  <label
                    key={t.topicId}
                    className="flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer"
                    style={{
                      borderColor: t.badge === 'completed'
                        ? '#dc2626'
                        : selected[t.topicId] ? '#2d6a4f' : '#e5e7eb',
                      background: selected[t.topicId] ? '#f0fdf4' : '#fff',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!selected[t.topicId]}
                      onChange={() => toggle(t.topicId)}
                      className="w-4 h-4 mt-0.5 rounded border-gray-300 accent-green-700"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{t.name}</div>
                      {t.badge === 'completed' && t.lastAssignment && (
                        <div className="text-xs mt-0.5" style={{ color: '#dc2626' }}>
                          Already completed
                          {t.lastAssignment.completedAt &&
                            ` on ${new Date(t.lastAssignment.completedAt).toLocaleDateString('en-IN')}`}
                        </div>
                      )}
                      {t.badge === 'active' && t.lastAssignment && (
                        <div className="text-xs mt-0.5 text-gray-500">
                          Already assigned — {t.lastAssignment.status.replace('_', ' ').toLowerCase()}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Due date for selected trainings
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                  style={{ borderColor: '#d1d5db' }}
                  disabled={selectedCount === 0}
                />
              </div>
            </>
          )}

          {!loading && !error && (
            <div className="mt-6 pt-4" style={{ borderTop: '1px solid #f3f4f6' }}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Previously assigned trainings
              </h4>

              {history.length === 0 ? (
                <p className="text-xs text-gray-400">
                  No trainings have ever been assigned to this person.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {history.map((h) => {
                    const style = STATUS_STYLE[h.status] ?? { bg: '#f3f4f6', color: '#374151' }
                    return (
                      <div
                        key={h.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg"
                        style={{ background: '#f9fafb' }}
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-gray-800 truncate">{h.topicName}</div>
                          <div className="text-xs text-gray-400">
                            {h.trigger} · assigned by {h.assignedBy} ·{' '}
                            {h.status === 'COMPLETED' && h.completedAt
                              ? `completed ${new Date(h.completedAt).toLocaleDateString('en-IN')}`
                              : `due ${new Date(h.dueDate).toLocaleDateString('en-IN')}`}
                          </div>
                        </div>
                        <span
                          className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: style.bg, color: style.color }}
                        >
                          {h.status.replace('_', ' ')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-4"
          style={{ borderTop: '1px solid #f3f4f6' }}
        >
          <span className="text-xs text-gray-400">
            {!loading && !error && trainings.length > 0 && `${selectedCount} of ${trainings.length} selected`}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
              style={{ borderColor: '#e5e7eb', color: '#374151', background: '#fff' }}
            >
              Cancel
            </button>
            <button
              onClick={handleContinue}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
              style={{ background: loading ? '#9ca3af' : '#2d6a4f', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
