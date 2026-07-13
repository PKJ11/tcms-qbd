'use client'

import { useState, useEffect, useCallback } from 'react'

const FIRST_CHECK_DELAY_MS = 10_000
const RECHECK_INTERVAL_MS  = 10 * 60 * 1000

interface Assignment { status: string }

export function ActiveTrainingsModal() {
  const [activeCount, setActiveCount] = useState(0)
  const [visible,     setVisible]     = useState(false)

  const checkActiveTrainings = useCallback(async () => {
    const res = await fetch('/api/assignments?view=mine')
    if (!res.ok) return
    const data = await res.json()
    const assignments = (data.assignments ?? []) as Assignment[]
    const count = assignments.filter(
      (a) => a.status === 'NOT_STARTED' || a.status === 'IN_PROGRESS'
    ).length

    setActiveCount(count)
    if (count > 0) setVisible(true)
  }, [])

  useEffect(() => {
    const firstCheck = setTimeout(checkActiveTrainings, FIRST_CHECK_DELAY_MS)
    const interval    = setInterval(checkActiveTrainings, RECHECK_INTERVAL_MS)
    return () => {
      clearTimeout(firstCheck)
      clearInterval(interval)
    }
  }, [checkActiveTrainings])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setVisible(false)
      }}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl"
        style={{ border: '1px solid #e5e7eb' }}
      >
        <div
          className="flex items-start justify-between px-6 pt-6 pb-4"
          style={{ borderBottom: '1px solid #f3f4f6' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: '#eff6ff' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Pending training reminder
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                You have {activeCount} active training{activeCount !== 1 ? 's' : ''} pending completion.
              </p>
            </div>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <a
            href="/assignments"
            onClick={() => setVisible(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
            style={{ background: '#2d6a4f' }}
          >
            View my assignments
          </a>
        </div>
      </div>
    </div>
  )
}
