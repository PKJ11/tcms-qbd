'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

interface IndexEntry {
  id:          string
  topicName:   string
  trigger:     string
  status:      string
  assignedAt:  string
  dueDate:     string
  startedAt:   string | null
  completedAt: string | null
  score:       number | null
  outcome:     string | null
  assignedBy:  string
}

interface Person {
  id:   string
  name: string
  employeeId: string
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  COMPLETED:   { bg: '#f0fdf4', color: '#166534' },
  IN_PROGRESS: { bg: '#eff6ff', color: '#1d4ed8' },
  NOT_STARTED: { bg: '#f9fafb', color: '#6b7280' },
  OVERDUE:     { bg: '#fef2f2', color: '#dc2626' },
  FAILED:      { bg: '#fef2f2', color: '#dc2626' },
}

interface Props {
  userId: string
  role:   string
}

export function TrainingIndexReport({ userId, role }: Props) {
  const [persons,   setPersons]   = useState<Person[]>([])
  const [selectedId, setSelectedId] = useState(userId)
  const [entries,   setEntries]   = useState<IndexEntry[]>([])
  const [loading,   setLoading]   = useState(true)

  const canViewOthers = ['MANAGER', 'TRAINING_HEAD', 'SUPER_ADMIN', 'MD'].includes(role)

  // Load persons for dropdown (admin only)
  useEffect(() => {
    if (!canViewOthers) return
    async function fetchPersons() {
      const res  = await fetch('/api/personnel?isActive=true')
      const data = await res.json()
      setPersons(data.persons ?? [])
    }
    fetchPersons()
  }, [canViewOthers])

  const fetchIndex = useCallback(async () => {
    if (!selectedId) return
    setLoading(true)
    const res  = await fetch(`/api/reports/training-index/${selectedId}`)
    const data = await res.json()
    setEntries(data.entries ?? [])
    setLoading(false)
  }, [selectedId])

  useEffect(() => { fetchIndex() }, [fetchIndex])

  function handleExport() {
    window.open(`/api/reports/training-index/${selectedId}?format=csv`, '_blank')
  }

  const selectedPerson = persons.find((p:any) => p.id === selectedId)
  const completed      = entries.filter((e:any) => e.status === 'COMPLETED').length
  const overdue        = entries.filter((e:any) => e.status === 'OVERDUE').length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">
            Training Index
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Per-person training record. Format QbD/QA/F/007-09 · URS-RPT-002
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canViewOthers && (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: '#e5e7eb' }}
            >
              {persons.map((p:any) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.employeeId}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: 'Total trainings', value: entries.length, color: '#374151' },
          { label: 'Completed',       value: completed,      color: '#166534' },
          { label: 'Overdue',         value: overdue,        color: '#dc2626' },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border p-4 text-center"
            style={{ borderColor: '#e5e7eb' }}
          >
            <div className="text-2xl font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Index table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading training index...
        </div>
      ) : entries.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          No training records found for this person
        </div>
      ) : (
        <div
          className="bg-white rounded-xl border overflow-hidden"
          style={{ borderColor: '#e5e7eb' }}
        >
          {/* Training Index header */}
          <div
            className="px-5 py-4"
            style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}
          >
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Training Index — Format QbD/QA/F/007-09
            </div>
            {selectedPerson && (
              <div className="text-sm font-semibold text-gray-900 mt-1">
                {selectedPerson.name} · {selectedPerson.employeeId}
              </div>
            )}
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['#', 'Topic', 'Trigger', 'Status', 'Assigned date', 'Due date', 'Completed', 'Score', 'Assigned by'].map((h, i) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    style={i === 0 ? { width: '40px' } : {}}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry:any, idx:number) => {
                const statusStyle = STATUS_STYLES[entry.status] ?? STATUS_STYLES.NOT_STARTED
                return (
                  <tr
                    key={entry.id}
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-900">
                      {entry.topicName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: '#f5f3ff', color: '#6d28d9' }}
                      >
                        {entry.trigger}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={statusStyle}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(entry.assignedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(entry.dueDate)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {entry.completedAt ? formatDate(entry.completedAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {entry.score !== null ? (
                        <span
                          className="font-semibold"
                          style={{ color: (entry.score ?? 0) >= 80 ? '#166534' : '#dc2626' }}
                        >
                          {entry.score}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {entry.assignedBy}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}