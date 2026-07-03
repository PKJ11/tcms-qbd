'use client'

import { useState, useEffect } from 'react'

interface Person {
  id:         string
  name:       string
  employeeId: string
  department: { name: string } | null
  qualificationRecords: {
    id:          string
    status:      string
    expiryDate:  string | null
    techniqueId: string
  }[]
}

interface Technique {
  id:   string
  name: string
  code: string
}

const CELL_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  APPROVED:    { bg: '#f0fdf4', color: '#166534', label: 'Qualified'   },
  EXPIRED:     { bg: '#fef2f2', color: '#dc2626', label: 'Expired'     },
  IN_PROGRESS: { bg: '#eff6ff', color: '#1d4ed8', label: 'In progress' },
  INITIATED:   { bg: '#f5f3ff', color: '#6d28d9', label: 'Initiated'   },
  NONE:        { bg: '#f9fafb', color: '#9ca3af', label: '—'           },
}

export function CompetencyMatrix() {
  const [persons,    setPersons]    = useState<Person[]>([])
  const [techniques, setTechniques] = useState<Technique[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    async function fetch_() {
      setLoading(true)
      const res  = await fetch('/api/qualifications/matrix')
      const data = await res.json()
      setPersons(data.persons    ?? [])
      setTechniques(data.techniques ?? [])
      setLoading(false)
    }
    fetch_()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Loading competency matrix...
      </div>
    )
  }

  if (techniques.length === 0 || persons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <p className="text-sm text-gray-400">
          {techniques.length === 0
            ? 'No techniques configured yet. Add techniques to see the matrix.'
            : 'No active personnel found.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(CELL_STYLES).filter(([k]) => k !== 'NONE').map(([, style]) => (
          <div key={style.label} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: style.bg, border: `1px solid ${style.color}20` }}
            />
            <span className="text-xs text-gray-500">{style.label}</span>
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
                <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap sticky left-0 z-10" style={{ background: '#f9fafb' }}>
                  Analyst
                </th>
                {techniques.map((t) => (
                  <th
                    key={t.id}
                    className="px-3 py-3 font-semibold text-gray-500 uppercase tracking-wide text-center whitespace-nowrap"
                  >
                    <div>{t.code}</div>
                    <div className="text-gray-400 font-normal normal-case" style={{ fontSize: '10px' }}>
                      {t.name.length > 18 ? t.name.slice(0, 18) + '…' : t.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {persons.map((p) => (
                <tr
                  key={p.id}
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                  className="hover:bg-gray-50"
                >
                  {/* Person info */}
                  <td
                    className="px-4 py-3 sticky left-0 z-10"
                    style={{ background: '#fff' }}
                  >
                    <div className="font-medium text-gray-900 whitespace-nowrap">
                      {p.name}
                    </div>
                    <div className="text-gray-400">{p.employeeId}</div>
                    {p.department && (
                      <div className="text-gray-400">{p.department.name}</div>
                    )}
                  </td>

                  {/* Qualification cells */}
                  {techniques.map((t) => {
                    const qual = p.qualificationRecords.find(
                      (q) => q.techniqueId === t.id
                    )

                    const status = qual?.status ?? 'NONE'

                    // Check if expiring within 30 days
                    const isExpiringSoon = qual?.status === 'APPROVED' && qual.expiryDate
                      ? new Date(qual.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                      : false

                    const style = isExpiringSoon
                      ? { bg: '#fefce8', color: '#854d0e', label: 'Expiring soon' }
                      : (CELL_STYLES[status] ?? CELL_STYLES.NONE)

                    return (
                      <td key={t.id} className="px-3 py-3 text-center">
                        <div
                          className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium mx-auto"
                          style={{ background: style.bg, color: style.color, minWidth: '80px' }}
                          title={isExpiringSoon ? `Expires: ${qual?.expiryDate}` : undefined}
                        >
                          {isExpiringSoon ? 'Expiring ⚠️' : style.label}
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
    </div>
  )
}