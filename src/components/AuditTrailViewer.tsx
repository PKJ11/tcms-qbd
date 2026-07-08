'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

interface PersonOption {
  id:         string
  name:       string
  employeeId: string
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

// Simple debounce hook — delays updating the "settled" value until
// the input has stopped changing for `delay` ms.
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function AuditTrailViewer() {
  const [logs,       setLogs]       = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(1)
  const [module,     setModule]     = useState('')
  const [action,     setAction]     = useState('')
  const [expanded,   setExpanded]   = useState<string | null>(null)

  // ── Justification search ──────────────────────────────────────
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 400)

  // ── Personnel filter ──────────────────────────────────────────
  const [personQuery, setPersonQuery]     = useState('')
  const debouncedPersonQuery              = useDebouncedValue(personQuery, 300)
  const [personOptions, setPersonOptions] = useState<PersonOption[]>([])
  const [personDropdownOpen, setPersonDropdownOpen] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null)
  const personBoxRef = useRef<HTMLDivElement>(null)

  // ── Date/time range filter ────────────────────────────────────
  const [dateFrom, setDateFrom] = useState('') // datetime-local string
  const [dateTo,   setDateTo]   = useState('')

  // Close person dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (personBoxRef.current && !personBoxRef.current.contains(e.target as Node)) {
        setPersonDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Fetch person suggestions as the user types (only if no person selected yet,
  // or they've changed the text away from the selected person's label)
  useEffect(() => {
    if (!debouncedPersonQuery.trim()) {
      setPersonOptions([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res  = await fetch(`/api/persons/search?q=${encodeURIComponent(debouncedPersonQuery)}`)
        const data = await res.json()
        if (!cancelled) setPersonOptions(data.persons ?? [])
      } catch {
        if (!cancelled) setPersonOptions([])
      }
    })()
    return () => { cancelled = true }
  }, [debouncedPersonQuery])

  function selectPerson(p: PersonOption) {
    setSelectedPerson(p)
    setPersonQuery(`${p.name} (${p.employeeId})`)
    setPersonDropdownOpen(false)
    setPage(1)
  }

  function clearPerson() {
    setSelectedPerson(null)
    setPersonQuery('')
    setPersonOptions([])
  }

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page:  page.toString(),
      limit: '20',
      ...(module ? { module } : {}),
      ...(action ? { action } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(selectedPerson ? { personId: selectedPerson.id } : {}),
      ...(dateFrom ? { dateFrom: new Date(dateFrom).toISOString() } : {}),
      ...(dateTo   ? { dateTo:   new Date(dateTo).toISOString()   } : {}),
    })

    const res  = await fetch(`/api/audit?${params}`)
    const data = await res.json()
    setLogs(data.logs ?? [])
    setPagination(data.pagination ?? null)
    setLoading(false)
  }, [page, module, action, search, selectedPerson, dateFrom, dateTo])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  function clearAllFilters() {
    setModule('')
    setAction('')
    setSearchInput('')
    clearPerson()
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasActiveFilters =
    module || action || search || selectedPerson || dateFrom || dateTo

  return (
    <div>
      {/* Filters */}
      <div
        className="bg-white rounded-xl border p-4 mb-4 flex flex-col gap-3"
        style={{ borderColor: '#e5e7eb' }}
      >
        {/* Row 1 — justification search + person search */}
        <div className="flex flex-wrap gap-3">
          {/* Justification text search */}
          <div className="flex-1 min-w-[220px]">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPage(1) }}
              placeholder="Search justification text..."
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: '#e5e7eb' }}
            />
          </div>

          {/* Personnel search / filter */}
          <div className="relative flex-1 min-w-[220px]" ref={personBoxRef}>
            <input
              type="text"
              value={personQuery}
              onChange={(e) => {
                setPersonQuery(e.target.value)
                setSelectedPerson(null)
                setPersonDropdownOpen(true)
                setPage(1)
              }}
              onFocus={() => setPersonDropdownOpen(true)}
              placeholder="Search person by name or employee ID..."
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: '#e5e7eb' }}
            />
            {selectedPerson && (
              <button
                onClick={clearPerson}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}

            {personDropdownOpen && personQuery.trim() && !selectedPerson && (
              <div
                className="absolute z-20 mt-1 w-full bg-white rounded-lg border shadow-lg max-h-56 overflow-y-auto"
                style={{ borderColor: '#e5e7eb' }}
              >
                {personOptions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400">
                    No matching personnel
                  </div>
                ) : (
                  personOptions.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectPerson(p)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between"
                    >
                      <span className="font-medium text-gray-900">{p.name}</span>
                      <span className="text-gray-400 font-mono">{p.employeeId}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2 — module / action / date range / clear */}
        <div className="flex flex-wrap items-center gap-3">
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

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">From</label>
            <input
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="px-2 py-1.5 rounded-lg border text-xs outline-none"
              style={{ borderColor: '#e5e7eb' }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">To</label>
            <input
              type="datetime-local"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="px-2 py-1.5 rounded-lg border text-xs outline-none"
              style={{ borderColor: '#e5e7eb' }}
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-2 rounded-lg border text-sm transition-colors"
              style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
            >
              Clear filters
            </button>
          )}

          {pagination && (
            <div className="ml-auto text-sm text-gray-400 self-center">
              {pagination.total} total entries
            </div>
          )}
        </div>
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