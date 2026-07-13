'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatDate } from '@/lib/utils'
import type { ReportScope } from './ReportsHub'
import { ReportFilterBar, EMPTY_REPORT_FILTERS, matchesReportFilters, type ReportFilters } from './ReportFilterBar'

interface OverdueRow {
  person: {
    id: string; name: string; employeeId: string
    department: string | null;  manager: string | null
  }
  assignment: {
    id: string; topicName: string; trigger: string
    dueDate: string; daysOverdue: number
  }
}

export function OverdueReport({ scope }: { scope: ReportScope }) {
  const [rows,    setRows]    = useState<OverdueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_REPORT_FILTERS)
  const isOrgWide = scope === 'all'

  const fetchRows = useCallback(async () => {
    setLoading(true)
    const res  = await fetch(`/api/reports/overdue?scope=${scope}`)
    const data = await res.json()
    setRows(data.rows ?? [])
    setLoading(false)
  }, [scope])

  useEffect(() => { fetchRows() }, [fetchRows])

  function handleExport() {
    window.open(`/api/reports/overdue?scope=${scope}&format=csv`, '_blank')
  }

  const filteredRows = useMemo(() => rows.filter((row) => matchesReportFilters(filters, {
    name: row.person.name,
    employeeId: row.person.employeeId,
    dates: [row.assignment.dueDate],
  })), [rows, filters])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Overdue Training Report</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {filteredRows.length} overdue assignment{filteredRows.length !== 1 ? 's' : ''} · URS-RPT-003
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

      {rows.length > 0 && (
        <ReportFilterBar filters={filters} onChange={setFilters} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading overdue report...
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <p className="text-sm text-gray-400">
            No overdue assignments — great compliance!
          </p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          No overdue assignments match the current filters.
        </div>
      ) : (
        <div
          className="bg-white rounded-xl border overflow-hidden"
          style={{ borderColor: '#e5e7eb' }}
        >
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                {['Person', 'Department', 'Topic', 'Trigger', 'Due date', 'Days overdue', 'Manager'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: '#dc2626' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                  className="hover:bg-red-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{row.person.name}</div>
                    <div className="text-xs text-gray-400">{row.person.employeeId}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {row.person.department ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 font-medium">
                    {row.assignment.topicName}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: '#f5f3ff', color: '#6d28d9' }}
                    >
                      {row.assignment.trigger}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatDate(row.assignment.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-1 rounded-lg text-xs font-bold"
                      style={{ background: '#fef2f2', color: '#dc2626' }}
                    >
                      {row.assignment.daysOverdue}d
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {row.person.manager ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}