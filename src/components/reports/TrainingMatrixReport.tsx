'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ReportScope } from './ReportsHub'
import { ReportFilterBar, EMPTY_REPORT_FILTERS, matchesReportFilters, type ReportFilters } from './ReportFilterBar'
import { orgFilterParams, type OrgFilterValue } from '@/components/shared/OrgFilterBar'
import { formatDate } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'COMPLETED',    label: 'Completed' },
  { value: 'IN_PROGRESS',  label: 'In progress' },
  { value: 'NOT_STARTED',  label: 'Not started' },
  { value: 'OVERDUE',      label: 'Overdue' },
  { value: 'FAILED',       label: 'Failed' },
  { value: 'NOT_ASSIGNED', label: 'Not assigned' },
]

interface MatrixRow {
  person: {
    id: string; name: string; employeeId: string
    department: { name: string } | null;
  }
  topics: {
    topicId: string; topicName: string; status: string
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

export function TrainingMatrixReport({ scope, orgFilter }: { scope: ReportScope; orgFilter: OrgFilterValue }) {
  const [matrix,   setMatrix]   = useState<MatrixRow[]>([])
  const [loading,  setLoading]  = useState(false)
  const [filters,  setFilters]  = useState<ReportFilters>(EMPTY_REPORT_FILTERS)
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')
  const isOrgWide = scope === 'all'

  // The matrix always depends on a chosen time period — and, for org-wide
  // viewers, a department too (team-scoped viewers are already fixed to
  // their own team).
  const hasRequiredFilters = !!fromDate && !!toDate && (!isOrgWide || !!orgFilter.departmentId)

  const fetchMatrix = useCallback(async () => {
    if (!hasRequiredFilters) { setMatrix([]); return }
    setLoading(true)
    const params = new URLSearchParams({ scope, from: fromDate, to: toDate, ...orgFilterParams(orgFilter) })
    const res  = await fetch(`/api/reports/training-matrix?${params}`)
    const data = await res.json()
    setMatrix(data.matrix ?? [])
    setLoading(false)
  }, [scope, orgFilter, fromDate, toDate, hasRequiredFilters])

  useEffect(() => { fetchMatrix() }, [fetchMatrix])

  function handleExport(format: 'csv' | 'pdf') {
    const params = new URLSearchParams({ scope, format, from: fromDate, to: toDate, ...orgFilterParams(orgFilter) })
    window.open(`/api/reports/training-matrix?${params}`, '_blank')
  }

  const topics = matrix[0]?.topics ?? []

  const filteredMatrix = useMemo(() => matrix.filter((row) => matchesReportFilters(filters, {
    name: row.person.name,
    employeeId: row.person.employeeId,
    dateValues: {},
  }) && (
    !filters.status
      ? true
      : row.topics.some((t) => t.status === filters.status)
  )), [matrix, filters])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Training Matrix</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {hasRequiredFilters
              ? `${filteredMatrix.length} person${filteredMatrix.length !== 1 ? 's' : ''} · ${topics.length} scheduled topic${topics.length !== 1 ? 's' : ''} in this period`
              : 'Depends on the period (and department) chosen below'}
            {' '}· Scheduled trainings only, not induction or refresher · Format QbD/QA/F/007-13
            {!isOrgWide && (
              <span
                className="ml-2 px-1.5 py-0.5 rounded text-xs font-semibold"
                style={{ background: '#eff6ff', color: '#1d4ed8' }}
              >
                My team
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={!hasRequiredFilters}
            className="px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 disabled:opacity-40"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={!hasRequiredFilters}
            className="px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 disabled:opacity-40"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* Period picker — always required */}
      <div className="bg-white rounded-xl border p-4 mb-4 flex items-center gap-3 flex-wrap" style={{ borderColor: '#e5e7eb' }}>
        <span className="text-sm font-medium text-gray-700">Period (when assigned):</span>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        />
        <span className="text-sm text-gray-400">to</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        />
        {isOrgWide && !orgFilter.departmentId && (
          <span className="text-xs" style={{ color: '#c2410c' }}>
            Also pick a department above to build the matrix.
          </span>
        )}
      </div>

      {!hasRequiredFilters ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-xl border" style={{ borderColor: '#e5e7eb' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p className="text-sm text-gray-400 text-center max-w-sm">
            Choose a time period{isOrgWide ? ' and department (above)' : ''} to build the matrix —
            columns show whichever scheduled topics were assigned to that scope during that window
            (induction and refresher trainings aren't included).
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Building training matrix...
        </div>
      ) : matrix.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          No people found for this scope.
        </div>
      ) : topics.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          No scheduled trainings were assigned to this scope during {formatDate(fromDate)} – {formatDate(toDate)}.
        </div>
      ) : (
        <>
          <ReportFilterBar filters={filters} onChange={setFilters} statusOptions={STATUS_OPTIONS} />

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
                  {filteredMatrix.length === 0 && (
                    <tr>
                      <td colSpan={topics.length + 1} className="px-4 py-8 text-center text-sm text-gray-400">
                        No people match the current filters.
                      </td>
                    </tr>
                  )}
                  {filteredMatrix.map((row) => (
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

                      {/* Status cells only */}
                      {row.topics.map((t) => {
                        const style = STATUS_CELL[t.status] ?? STATUS_CELL.NOT_ASSIGNED
                        return (
                          <td key={t.topicId} className="px-2 py-3 text-center">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold mx-auto text-sm"
                              style={{ background: style.bg, color: style.color }}
                              title={t.status}
                            >
                              {style.label}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
