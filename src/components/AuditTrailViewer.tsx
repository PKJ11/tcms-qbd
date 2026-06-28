'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDateTime } from '@/lib/utils'

interface AuditLog {
  id:            string
  action:        string
  module:        string
  recordId:      string
  recordType:    string
  beforeValue:   object | null
  afterValue:    object | null
  justification: string
  ipAddress:     string | null
  createdAt:     string
  user: {
    id:         string
    name:       string
    email:      string
    employeeId: string
  }
}

interface Pagination {
  page:       number
  limit:      number
  total:      number
  totalPages: number
}

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  CREATE:   { bg: '#f0fdf4', color: '#166534' },
  UPDATE:   { bg: '#eff6ff', color: '#1d4ed8' },
  DELETE:   { bg: '#fef2f2', color: '#dc2626' },
  LOGIN:    { bg: '#f5f3ff', color: '#6d28d9' },
  LOGOUT:   { bg: '#fafafa', color: '#6b7280' },
  APPROVE:  { bg: '#f0fdf4', color: '#166534' },
  REJECT:   { bg: '#fef2f2', color: '#dc2626' },
  UPLOAD:   { bg: '#fff7ed', color: '#c2410c' },
  GENERATE: { bg: '#fefce8', color: '#854d0e' },
  ASSIGN:   { bg: '#eff6ff', color: '#1d4ed8' },
  REVOKE:   { bg: '#fef2f2', color: '#dc2626' },
}

export function AuditTrailViewer() {
  const [logs,       setLogs]       = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(1)
  const [module,     setModule]     = useState('')
  const [action,     setAction]     = useState('')
  const [expanded,   setExpanded]   = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page:  page.toString(),
      limit: '20',
      ...(module ? { module } : {}),
      ...(action ? { action } : {}),
    })

    const res  = await fetch(`/api/audit?${params}`)
    const data = await res.json()
    setLogs(data.logs ?? [])
    setPagination(data.pagination ?? null)
    setLoading(false)
  }, [page, module, action])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return (
    <div>
      {/* Filters */}
      <div
        className="bg-white rounded-xl border p-4 mb-4 flex flex-wrap gap-3"
        style={{ borderColor: '#e5e7eb' }}
      >
        <select
          value={module}
          onChange={(e) => { setModule(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="">All modules</option>
          {[
            'AUTH','PERSONNEL','TRAINING_TOPIC',
            'TRAINING_ASSIGNMENT','CONTENT',
            'ASSESSMENT','QUALIFICATION',
            'REFRESHER','ADMIN','SYSTEM',
          ].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="">All actions</option>
          {[
            'CREATE','UPDATE','DELETE','LOGIN',
            'LOGOUT','APPROVE','REJECT','UPLOAD',
            'GENERATE','ASSIGN','REVOKE',
          ].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <button
          onClick={() => { setModule(''); setAction(''); setPage(1) }}
          className="px-3 py-2 rounded-lg border text-sm transition-colors"
          style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
        >
          Clear filters
        </button>

        {pagination && (
          <div className="ml-auto text-sm text-gray-400 self-center">
            {pagination.total} total entries
          </div>
        )}
      </div>

      {/* Table */}
      <div
        className="bg-white rounded-xl border overflow-hidden"
        style={{ borderColor: '#e5e7eb' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            No audit log entries found.
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['When','Who','Module','Action','Record','Justification',''].map((h) => (
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
              {logs.map((log) => {
                const actionStyle = ACTION_COLORS[log.action] ?? {
                  bg: '#f9fafb', color: '#374151'
                }
                const isExpanded = expanded === log.id

                return (
                  <>
                    <tr
                      key={log.id}
                      style={{ borderBottom: '1px solid #f3f4f6' }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* When */}
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {formatDateTime(log.createdAt)}
                      </td>

                      {/* Who */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-xs">
                          {log.user.name}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {log.user.employeeId}
                        </div>
                      </td>

                      {/* Module */}
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {log.module}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={actionStyle}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Record */}
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        <div>{log.recordType}</div>
                        <div className="text-gray-400 font-mono text-xs">
                          {log.recordId.slice(0, 8)}...
                        </div>
                      </td>

                      {/* Justification */}
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-xs">
                        <div className="truncate" title={log.justification}>
                          {log.justification}
                        </div>
                      </td>

                      {/* Expand */}
                      <td className="px-4 py-3">
                        {(log.beforeValue || log.afterValue) && (
                          <button
                            onClick={() =>
                              setExpanded(isExpanded ? null : log.id)
                            }
                            className="text-xs px-2 py-1 rounded border transition-colors"
                            style={{
                              borderColor: '#e5e7eb',
                              color:       '#6b7280',
                            }}
                          >
                            {isExpanded ? 'Hide' : 'Diff'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded diff row */}
                    {isExpanded && (
                      <tr
                        key={`${log.id}-diff`}
                        style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}
                      >
                        <td colSpan={7} className="px-4 py-3">
                          <div className="grid grid-cols-2 gap-4">
                            {log.beforeValue && (
                              <div>
                                <div className="text-xs font-semibold text-gray-500 mb-1">
                                  Before
                                </div>
                                <pre
                                  className="text-xs rounded-lg p-3 overflow-auto max-h-40"
                                  style={{
                                    background: '#fef2f2',
                                    color:      '#991b1b',
                                  }}
                                >
                                  {JSON.stringify(log.beforeValue, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.afterValue && (
                              <div>
                                <div className="text-xs font-semibold text-gray-500 mb-1">
                                  After
                                </div>
                                <pre
                                  className="text-xs rounded-lg p-3 overflow-auto max-h-40"
                                  style={{
                                    background: '#f0fdf4',
                                    color:      '#166534',
                                  }}
                                >
                                  {JSON.stringify(log.afterValue, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid #e5e7eb' }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border text-xs transition-colors disabled:opacity-40"
              style={{ borderColor: '#e5e7eb', color: '#374151' }}
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-3 py-1.5 rounded-lg border text-xs transition-colors disabled:opacity-40"
              style={{ borderColor: '#e5e7eb', color: '#374151' }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}