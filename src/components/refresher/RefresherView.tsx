'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

interface Refresher {
  id:            string
  triggerType:   string
  status:        string
  justification: string
  dueDate:       string
  completedAt:   string | null
  createdAt:     string
  person:        { id: string; name: string; employeeId: string }
  topic:         { id: string; name: string }
  raisedBy:      { id: string; name: string }
}

interface Stats {
  pending:            number
  overdue:            number
  completedThisMonth: number
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:   { bg: '#fefce8', color: '#854d0e', label: 'Pending'   },
  COMPLETED: { bg: '#f0fdf4', color: '#166534', label: 'Completed' },
  OVERDUE:   { bg: '#fef2f2', color: '#dc2626', label: 'Overdue'   },
}

const TRIGGER_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  PLANNED:   { bg: '#eff6ff', color: '#1d4ed8', label: 'Planned'   },
  DEVIATION: { bg: '#fef2f2', color: '#dc2626', label: 'Deviation' },
  INCIDENT:  { bg: '#fff7ed', color: '#c2410c', label: 'Incident'  },
}

export function RefresherView({ canTrigger }: { canTrigger: boolean }) {
  const [refreshers,   setRefreshers]   = useState<Refresher[]>([])
  const [stats,        setStats]        = useState<Stats | null>(null)
  const [loading,       setLoading]     = useState(true)
  const [statusFilter,  setStatusFilter] = useState('')
  const [triggerFilter, setTriggerFilter] = useState('')
  const [tab,            setTab]        = useState<'all' | 'mine'>(canTrigger ? 'all' : 'mine')

  const fetchData = useCallback(async () => {
    setLoading(true)

    const params = new URLSearchParams({
      ...(tab === 'mine' ? { view: 'mine' } : {}),
      ...(statusFilter   ? { status: statusFilter }      : {}),
      ...(triggerFilter  ? { triggerType: triggerFilter } : {}),
    })

    const [refRes, statsRes] = await Promise.all([
      fetch(`/api/refresher?${params}`),
      canTrigger ? fetch('/api/refresher/stats') : Promise.resolve(null),
    ])

    const refData = await refRes.json()
    setRefreshers(refData.refreshers ?? [])

    if (statsRes) {
      const statsData = await statsRes.json()
      setStats(statsData)
    }

    setLoading(false)
  }, [tab, statusFilter, triggerFilter, canTrigger])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <>
      {/* Stats — admin only */}
      {canTrigger && stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Pending',             value: stats.pending,            color: '#854d0e' },
            { label: 'Overdue',             value: stats.overdue,            color: '#dc2626' },
            { label: 'Completed this month', value: stats.completedThisMonth, color: '#166534' },
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
      )}

      {/* Tabs — admin only */}
      {canTrigger && (
        <div className="flex gap-2 mb-5 p-1 rounded-lg w-fit" style={{ background: '#e5e7eb' }}>
          <button
            onClick={() => setTab('all')}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: tab === 'all' ? '#fff' : 'transparent',
              color:      tab === 'all' ? '#2d6a4f' : '#6b7280',
              boxShadow:  tab === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            All refreshers
          </button>
          <button
            onClick={() => setTab('mine')}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: tab === 'mine' ? '#fff' : 'transparent',
              color:      tab === 'mine' ? '#2d6a4f' : '#6b7280',
              boxShadow:  tab === 'mine' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            My refreshers
          </button>
        </div>
      )}

      {/* Filters */}
      <div
        className="bg-white rounded-xl border p-4 mb-4 flex flex-wrap gap-3"
        style={{ borderColor: '#e5e7eb' }}
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="OVERDUE">Overdue</option>
        </select>

        <select
          value={triggerFilter}
          onChange={(e) => setTriggerFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="">All trigger types</option>
          <option value="PLANNED">Planned</option>
          <option value="DEVIATION">Deviation</option>
          <option value="INCIDENT">Incident</option>
        </select>

        <div className="ml-auto text-sm text-gray-400 self-center">
          {refreshers.length} refresher{refreshers.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading refreshers...
        </div>
      ) : refreshers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          <p className="text-sm text-gray-400">No refresher trainings found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {refreshers.map((r) => {
            const statusStyle  = STATUS_STYLES[r.status]       ?? STATUS_STYLES.PENDING
            const triggerStyle = TRIGGER_STYLES[r.triggerType] ?? TRIGGER_STYLES.PLANNED

            return (
              <div
                key={r.id}
                className="bg-white rounded-xl border p-5"
                style={{
                  borderColor: r.status === 'OVERDUE' ? '#fecaca' : '#e5e7eb',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {r.person.name}
                      </h3>
                      <span className="text-xs text-gray-400">{r.person.employeeId}</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={statusStyle}
                      >
                        {statusStyle.label}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={triggerStyle}
                      >
                        {triggerStyle.label}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 mb-1">{r.topic.name}</p>

                    <div
                      className="text-xs text-gray-500 px-3 py-2 rounded-lg mt-2"
                      style={{ background: '#fafafa' }}
                    >
                      <span className="font-medium text-gray-600">Reason: </span>
                      {r.justification}
                    </div>

                    <div className="text-xs text-gray-400 mt-2">
                      Due {formatDate(r.dueDate)} &nbsp;·&nbsp;
                      Raised by {r.raisedBy.name} &nbsp;·&nbsp;
                      {formatDate(r.createdAt)}
                      {r.completedAt && (
                        <> &nbsp;·&nbsp; Completed {formatDate(r.completedAt)}</>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}