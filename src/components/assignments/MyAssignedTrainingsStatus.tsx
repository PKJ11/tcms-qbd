'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

interface Assignment {
  id:          string
  status:      string
  dueDate:     string
  createdAt:   string
  person:      { id: string; name: string; employeeId: string }
  topic:       { id: string; name: string }
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  NOT_STARTED: { bg: '#f9fafb', color: '#6b7280', label: 'Not started' },
  IN_PROGRESS: { bg: '#eff6ff', color: '#1d4ed8', label: 'In progress' },
  COMPLETED:   { bg: '#f0fdf4', color: '#166534', label: 'Completed'   },
  OVERDUE:     { bg: '#fef2f2', color: '#dc2626', label: 'Overdue'     },
  FAILED:      { bg: '#fff7ed', color: '#c2410c', label: 'Under review' },
}

export function MyAssignedTrainingsStatus() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ view: 'assigned-by-me' })
    if (statusFilter) params.set('status', statusFilter)
    const res  = await fetch(`/api/assignments?${params}`)
    const data = await res.json()
    setAssignments(data.assignments ?? [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  const counts = {
    total:       assignments.length,
    completed:   assignments.filter((a) => a.status === 'COMPLETED').length,
    inProgress:  assignments.filter((a) => a.status === 'IN_PROGRESS' || a.status === 'NOT_STARTED').length,
    overdue:     assignments.filter((a) => a.status === 'OVERDUE').length,
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total assigned', value: counts.total,      color: '#374151' },
          { label: 'Completed',      value: counts.completed,  color: '#166534' },
          { label: 'In progress',    value: counts.inProgress, color: '#1d4ed8' },
          { label: 'Overdue',        value: counts.overdue,    color: '#dc2626' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-4 text-center" style={{ borderColor: '#e5e7eb' }}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Trainings you've assigned</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border text-xs outline-none"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="">All statuses</option>
          {Object.keys(STATUS_STYLES).map((s) => (
            <option key={s} value={s}>{STATUS_STYLES[s].label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading...
        </div>
      ) : assignments.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          You haven't assigned any training yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Trainee', 'Topic', 'Status', 'Assigned', 'Due date'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => {
                const style = STATUS_STYLES[a.status] ?? STATUS_STYLES.NOT_STARTED
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{a.person.name}</div>
                      <div className="text-xs text-gray-400">{a.person.employeeId}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{a.topic.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={style}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(a.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(a.dueDate)}</td>
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
