'use client'

import { useState, useEffect, useMemo } from 'react'

interface Trainer {
  id:          string
  name:        string
  employeeId:  string
  designation: string
  roles:       string[]
  department:  string | null
  unit:        string | null
  section:     string | null
}

export function TrainersList() {
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    fetch('/api/reports/trainers')
      .then((res) => res.json())
      .then((data) => { setTrainers(data.trainers ?? []); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return trainers
    return trainers.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.employeeId.toLowerCase().includes(q) ||
      t.department?.toLowerCase().includes(q) ||
      t.unit?.toLowerCase().includes(q) ||
      t.section?.toLowerCase().includes(q)
    )
  }, [trainers, search])

  function handleExport(format: 'csv' | 'pdf') {
    window.open(`/api/reports/trainers?format=${format}`, '_blank')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">List of Trainers</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Every active Trainer and Guest Trainer, with their department, unit and section.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
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
          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2"
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

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, employee ID, department, unit or section..."
        className="w-full px-3 py-2 rounded-lg border text-sm outline-none mb-4"
        style={{ borderColor: '#e5e7eb' }}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading trainers...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          {trainers.length === 0 ? 'No active trainers found.' : 'No trainers match your search.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['#', 'Name', 'Employee ID', 'Designation', 'Department', 'Unit', 'Section'].map((h, i) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    style={i === 0 ? { width: '40px' } : {}}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, idx) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">
                    {t.name}
                    {t.roles.includes('GUEST_TRAINER') && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-semibold" style={{ background: '#fff7ed', color: '#c2410c' }}>
                        Guest
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.employeeId}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.designation}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.department ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.unit ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.section ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
