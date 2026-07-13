'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ReportScope } from './ReportsHub'

interface MatrixRow {
  person: {
    id: string; name: string; employeeId: string
    department: { name: string } | null;
  }
  topics: {
    topicId: string; topicName: string; status: string
    score?: number; completedAt?: string | null; dueDate?: string | null
    assignedBy?: string | null
  }[]
}

const STATUS_CELL: Record<string, { bg: string; color: string; label: string }> = {
  COMPLETED:    { bg: '#f0fdf4', color: '#166534', label: '✓'         },
  IN_PROGRESS:  { bg: '#eff6ff', color: '#1d4ed8', label: '◐'         },
  NOT_STARTED:  { bg: '#fefce8', color: '#854d0e', label: '○'         },
  OVERDUE:      { bg: '#fef2f2', color: '#dc2626', label: '!'         },
  FAILED:       { bg: '#fef2f2', color: '#dc2626', label: '✗'         },
  NOT_ASSIGNED: { bg: '#f9fafb', color: '#9ca3af', label: '—'         },
}

export function TrainingMatrixReport({ scope }: { scope: ReportScope }) {
  const [matrix,  setMatrix]  = useState<MatrixRow[]>([])
  const [loading, setLoading] = useState(true)
  const isOrgWide = scope === 'all'

  const fetchMatrix = useCallback(async () => {
    setLoading(true)
    const res  = await fetch(`/api/reports/training-matrix?scope=${scope}`)
    const data = await res.json()
    setMatrix(data.matrix ?? [])
    setLoading(false)
  }, [scope])

  useEffect(() => { fetchMatrix() }, [fetchMatrix])

  function handleExport() {
    window.open(`/api/reports/training-matrix?scope=${scope}&format=csv`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Building training matrix...
      </div>
    )
  }

  if (matrix.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        No data available
      </div>
    )
  }

  const topics = matrix[0]?.topics ?? []

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Training Matrix</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {matrix.length} person{matrix.length !== 1 ? 's' : ''} ·{' '}
            {(matrix[0]?.topics ?? []).length} topic{(matrix[0]?.topics ?? []).length !== 1 ? 's' : ''} ·{' '}
            Format QbD/QA/F/007-13
            {!isOrgWide && (
              <span
                className="ml-2 px-1.5 py-0.5 rounded text-xs font-semibold"
                style={{ background: '#eff6ff', color: '#1d4ed8' }}
              >
                {scope === 'team' ? 'My team' : 'My reportees'}
              </span>
            )}
          </p>
        </div>
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

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(STATUS_CELL).map(([, style]) => (
          <div key={style.label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
              style={{ background: style.bg, color: style.color }}
            >
              {style.label}
            </div>
            <span style={{ color: style.color }}>{
              style.label === '✓' ? 'Completed' :
              style.label === '◐' ? 'In progress' :
              style.label === '○' ? 'Not started' :
              style.label === '!' ? 'Overdue' :
              style.label === '✗' ? 'Failed' : 'Not assigned'
            }</span>
          </div>
        ))}
      </div>

      {/* Matrix table */}
      <div
        className="bg-white rounded-xl border overflow-hidden"
        style={{ borderColor: '#e5e7eb' }}
      >
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse" style={{ minWidth: '100%' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap sticky left-0 z-10"
                  style={{ background: '#f9fafb', minWidth: '180px' }}
                >
                  Person
                </th>
                {topics.map((t) => (
                  <th
                    key={t.topicId}
                    className="px-2 py-3 font-semibold text-gray-500 uppercase tracking-wide text-center"
                    style={{ minWidth: '80px', maxWidth: '100px' }}
                  >
                    <div
                      className="text-center"
                      title={t.topicName}
                      style={{ fontSize: '10px' }}
                    >
                      {t.topicName.length > 14
                        ? t.topicName.slice(0, 14) + '…'
                        : t.topicName}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr
                  key={row.person.id}
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                  className="hover:bg-gray-50"
                >
                  {/* Person */}
                  <td
                    className="px-4 py-3 sticky left-0 z-10"
                    style={{ background: '#fff' }}
                  >
                    <div className="font-medium text-gray-900 whitespace-nowrap">
                      {row.person.name}
                    </div>
                    <div className="text-gray-400">
                      {row.person.employeeId}
                    </div>
                    <div className="text-gray-400">
                      {row.person.department?.name ?? '—'}
                    </div>
                  </td>

                  {/* Status cells */}
                  {row.topics.map((t) => {
                    const style = STATUS_CELL[t.status] ?? STATUS_CELL.NOT_ASSIGNED
                    return (
                      <td key={t.topicId} className="px-2 py-3 text-center">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold mx-auto text-sm"
                          style={{ background: style.bg, color: style.color }}
                          title={
                            [
                              t.status === 'COMPLETED' && t.score ? `Score: ${t.score}%` : null,
                              t.dueDate ? `Due: ${new Date(t.dueDate).toLocaleDateString('en-IN')}` : null,
                              t.assignedBy ? `Assigned by: ${t.assignedBy}` : null,
                            ].filter(Boolean).join(' · ') || t.status
                          }
                        >
                          {style.label}
                        </div>
                        {t.score !== undefined && t.status === 'COMPLETED' && (
                          <div className="text-center mt-0.5" style={{ color: '#166534', fontSize: '10px' }}>
                            {t.score}%
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}