'use client'

import { useState, useEffect, useMemo } from 'react'
import { formatDate } from '@/lib/utils'
import type { ReportScope } from './ReportsHub'

interface Row {
  assignmentId: string
  sopNo:        string
  title:        string
  revisionNo:   string
  readOn:       string | null
  empName:      string
  employeeId:   string
  completedAt:  string | null
}

export function SopSelfReadoutList({ scope }: { scope: ReportScope }) {
  const [rows,    setRows]    = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reports/sop-self-readout?scope=${scope}`)
      .then((res) => res.json())
      .then((data) => { setRows(data.rows ?? []); setLoading(false) })
  }, [scope])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      r.sopNo.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.empName.toLowerCase().includes(q) ||
      r.employeeId.toLowerCase().includes(q)
    )
  }, [rows, search])

  function handleExport(format: 'csv' | 'pdf') {
    window.open(`/api/reports/sop-self-readout?scope=${scope}&format=${format}`, '_blank')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">List of SOPs-Self Readout</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Every SOP self-readout training. The trainee-signature column shows the employee
            name and the completion date — or N/A while the readout is pending. Format QbD/QA/F/007-12
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
        placeholder="Search by SOP number, title, employee name or ID..."
        className="w-full px-3 py-2 rounded-lg border text-sm outline-none mb-4"
        style={{ borderColor: '#e5e7eb' }}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading SOP self-readouts...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          {rows.length === 0 ? 'No SOP self-readout trainings found.' : 'No rows match your search.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['#', 'SOP No.', 'Title', 'Revision No.', 'SOP read on', 'Emp. Name / Date of Trainee'].map((h, i) => (
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
              {filtered.map((r, idx) => (
                <tr key={r.assignmentId} style={{ borderBottom: '1px solid #f3f4f6' }} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{r.sopNo}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">{r.title}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.revisionNo}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.readOn ? formatDate(r.readOn) : '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-medium text-gray-900">{r.empName}</div>
                    <div className={r.completedAt ? 'text-gray-500' : 'text-red-500 font-medium'}>
                      {r.completedAt ? formatDate(r.completedAt) : 'N/A'}
                    </div>
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
