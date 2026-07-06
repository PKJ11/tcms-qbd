'use client'

import { useState } from 'react'

export function OverdueScanAdmin() {
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<{
    dueSoon: number
    overdue: number
  } | null>(null)

  async function handleScan() {
    setLoading(true)
    setResult(null)

    const res  = await fetch('/api/notifications/scan', { method: 'POST' })
    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      setResult({ dueSoon: data.dueSoon, overdue: data.overdue })
    }
  }

  return (
    <div
      className="bg-white rounded-2xl border p-6"
      style={{ borderColor: '#e5e7eb' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Overdue & Due-Soon Scanner
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Scans all active assignments and qualifications.
            Sends in-app notifications for items due within 3 days or already overdue.
            Run this daily or set up a scheduled job. URS-RFR-003.
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50"
          style={{ background: '#2d6a4f' }}
        >
          {loading ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 00-9-9"/>
              </svg>
              Scanning...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              Run scan now
            </>
          )}
        </button>
      </div>

      {result && (
        <div className="grid grid-cols-2 gap-4">
          <div
            className="p-3 rounded-lg text-center"
            style={{ background: '#fefce8' }}
          >
            <div className="text-xl font-bold" style={{ color: '#854d0e' }}>
              {result.dueSoon}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Due-soon notifications sent
            </div>
          </div>
          <div
            className="p-3 rounded-lg text-center"
            style={{ background: '#fef2f2' }}
          >
            <div className="text-xl font-bold" style={{ color: '#dc2626' }}>
              {result.overdue}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Overdue notifications sent
            </div>
          </div>
        </div>
      )}
    </div>
  )
}