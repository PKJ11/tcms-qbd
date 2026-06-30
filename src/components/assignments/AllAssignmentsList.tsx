'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

interface Assignment {
  id:          string
  trigger:     string
  status:      string
  dueDate:     string
  startedAt:   string | null
  completedAt: string | null
  person:      { id: string; name: string; employeeId: string }
  topic:       { id: string; name: string }
  assignedBy:  { id: string; name: string }
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  NOT_STARTED: { bg: '#f9fafb', color: '#6b7280', label: 'Not started'  },
  IN_PROGRESS: { bg: '#eff6ff', color: '#1d4ed8', label: 'In progress'  },
  COMPLETED:   { bg: '#f0fdf4', color: '#166534', label: 'Completed'    },
  OVERDUE:     { bg: '#fef2f2', color: '#dc2626', label: 'Overdue'      },
  FAILED:      { bg: '#fef2f2', color: '#dc2626', label: 'Failed'       },
}

const TRIGGER_LABELS: Record<string, string> = {
  INDUCTION:  'Induction',
  UPGRADE:    'Role upgrade',
  RETRAINING: 'Retraining',
  REFRESHER:  'Refresher',
}

export function AllAssignmentsList({ isManager }: { isManager: boolean }) {
  const [assignments,  setAssignments]  = useState<Assignment[]>([])
  const [loading,      setLoading]      = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search,       setSearch]       = useState('')

  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      ...(statusFilter ? { status: statusFilter } : {}),
    })
    const res  = await fetch(`/api/assignments?${params}`)
    const data = await res.json()
    setAssignments(data.assignments ?? [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  const filtered = assignments.filter((a) =>
    search === '' ||
    a.person.name.toLowerCase().includes(search.toLowerCase()) ||
    a.topic.name.toLowerCase().includes(search.toLowerCase())
  )

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
            placeholder="Search person or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: '#e5e7eb' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="">All statuses</option>
          <option value="NOT_STARTED">Not started</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="OVERDUE">Overdue</option>
        </select>

        <div className="ml-auto text-sm text-gray-400 self-center">
          {filtered.length} assignment{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div
        className="bg-white rounded-xl border overflow-hidden"
        style={{ borderColor: '#e5e7eb' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            Loading assignments...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            No assignments found
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Person','Topic','Trigger','Status','Due date','Assigned by'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const statusStyle = STATUS_STYLES[a.status] ?? STATUS_STYLES.NOT_STARTED
                return (
                  <tr
                    key={a.id}
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{a.person.name}</div>
                      <div className="text-xs text-gray-400">{a.person.employeeId}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{a.topic.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: '#f5f3ff', color: '#6d28d9' }}
                      >
                        {TRIGGER_LABELS[a.trigger]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={statusStyle}
                      >
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(a.dueDate)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {a.assignedBy.name}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}