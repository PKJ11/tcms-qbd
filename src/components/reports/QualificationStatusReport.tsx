'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'
import type { ReportScope } from './ReportsHub'

interface QualRow {
  person:      { id: string; name: string; employeeId: string; department: string | null }
  technique:   string
  status:      string
  outcome:     string | null
  approvedAt:  string | null
  expiryDate:  string | null
  daysToExpiry: number | null
  certNumber:  string | null
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  INITIATED:   { bg: '#f5f3ff', color: '#6d28d9' },
  IN_PROGRESS: { bg: '#eff6ff', color: '#1d4ed8' },
  APPROVED:    { bg: '#f0fdf4', color: '#166534' },
  EXPIRED:     { bg: '#fef2f2', color: '#dc2626' },
  REVOKED:     { bg: '#f9fafb', color: '#6b7280' },
}

export function QualificationStatusReport({ scope }: { scope: ReportScope }) {
  const [rows,    setRows]    = useState<QualRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('')
  const isOrgWide = scope === 'all'

  const fetchRows = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ scope, ...(filter ? { status: filter } : {}) })
    const res    = await fetch(`/api/reports/qualification-status?${params}`)
    const data   = await res.json()
    setRows(data.rows ?? [])
    setLoading(false)
  }, [filter, scope])

  useEffect(() => { fetchRows() }, [fetchRows])

  function handleExport() {
    const params = new URLSearchParams({ scope, format: 'csv', ...(filter ? { status: filter } : {}) })
    window.open(`/api/reports/qualification-status?${params}`, '_blank')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Qualification Status Board</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {rows.length} record{rows.length !== 1 ? 's' : ''} · URS-RPT-004
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
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: '#e5e7eb' }}
          >
            <option value="">All statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="EXPIRED">Expired</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="REVOKED">Revoked</option>
          </select>
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

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading qualification status...
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          No qualification records found
        </div>
      ) : (
        <div
          className="bg-white rounded-xl border overflow-hidden"
          style={{ borderColor: '#e5e7eb' }}
        >
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Person', 'Technique', 'Status', 'Approved', 'Expiry', 'Days left', 'Certificate'].map((h) => (
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
              {rows.map((row, i) => {
                const statusStyle  = STATUS_STYLES[row.status] ?? STATUS_STYLES.IN_PROGRESS
                const isExpiringSoon = row.daysToExpiry !== null && row.daysToExpiry <= 30 && row.daysToExpiry > 0
                const isExpired      = row.status === 'EXPIRED' || (row.daysToExpiry !== null && row.daysToExpiry <= 0)

                return (
                  <tr
                    key={i}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      background:   isExpired      ? '#fef2f250'
                                  : isExpiringSoon ? '#fefce850'
                                  : 'transparent',
                    }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.person.name}</div>
                      <div className="text-xs text-gray-400">{row.person.employeeId}</div>
                      {row.person.department && (
                        <div className="text-xs text-gray-400">{row.person.department}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-700">
                      {row.technique}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={statusStyle}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {row.approvedAt ? formatDate(row.approvedAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {row.expiryDate ? formatDate(row.expiryDate) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {row.daysToExpiry !== null ? (
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: isExpired      ? '#fef2f2'
                                      : isExpiringSoon ? '#fefce8'
                                      : '#f0fdf4',
                            color:      isExpired      ? '#dc2626'
                                      : isExpiringSoon ? '#854d0e'
                                      : '#166534',
                          }}
                        >
                          {isExpired ? 'Expired' : `${row.daysToExpiry}d`}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">
                      {row.certNumber ?? '—'}
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