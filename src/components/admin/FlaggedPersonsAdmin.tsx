'use client'

import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/utils'

interface FlaggedPerson {
  id:           string
  name:         string
  employeeId:   string
  designation:  string
  flaggedAt:    string | null
  flagReason:   string | null
  department:   { name: string } | null
}

export function FlaggedPersonsAdmin() {
  const [persons,  setPersons]  = useState<FlaggedPerson[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function fetchFlagged() {
      setLoading(true)
      const res  = await fetch('/api/admin/flagged-persons')
      const data = await res.json()
      setPersons(data.persons ?? [])
      setLoading(false)
    }
    fetchFlagged()
  }, [])

  if (!loading && persons.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e5e7eb' }}>
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: '#fef2f2' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Job Reassignment Review Required
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Per SOP QbD-QA-SOP-007 — persons who failed to achieve competency after
            3 retraining cycles require job responsibility review.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {persons.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-xl border"
              style={{ background: '#fef2f2', borderColor: '#fecaca' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {p.name}
                    <span className="text-xs font-normal text-gray-400 ml-2">
                      {p.employeeId}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {p.designation}
                    {p.department ? ` · ${p.department.name}` : ''}
                  </div>
                  {p.flagReason && (
                    <div className="text-xs mt-2" style={{ color: '#991b1b' }}>
                      {p.flagReason}
                    </div>
                  )}
                  {p.flaggedAt && (
                    <div className="text-xs text-gray-400 mt-1">
                      Flagged on {formatDate(p.flaggedAt)}
                    </div>
                  )}
                </div>
                <a
                  href={`/personnel/${p.id}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: '#dc2626', color: '#fff' }}
                >
                  View profile
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}