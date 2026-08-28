'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'
import type { ReportScope } from './ReportsHub'

interface Topic { id: string; name: string }

interface Attendee {
  personId:    string
  name:        string
  employeeId:  string
  department:  string | null
  completedAt: string
}

interface Record_ {
  topicId:      string
  topicName:    string
  sopReference: string | null
  date:         string
  trainerName:  string | null
  attendees:    Attendee[]
}

export function TrainingAttendanceRecord({ scope }: { scope: ReportScope }) {
  const [topics,  setTopics]  = useState<Topic[]>([])
  const [topicId, setTopicId] = useState('')
  const [date,    setDate]    = useState('')
  const [record,  setRecord]  = useState<Record_ | null>(null)
  const [loading, setLoading] = useState(false)

  const hasRequiredFilters = !!topicId && !!date

  // Topic list — reuses the Topic Completion report's topic lookup so the
  // dropdown doesn't need its own duplicate endpoint.
  useEffect(() => {
    fetch('/api/reports/topic-completion')
      .then((res) => res.json())
      .then((data) => setTopics(data.topics ?? []))
  }, [])

  const fetchRecord = useCallback(async () => {
    if (!hasRequiredFilters) { setRecord(null); return }
    setLoading(true)
    const params = new URLSearchParams({ scope, topicId, date })
    const res  = await fetch(`/api/reports/training-attendance?${params}`)
    const data = await res.json()
    setRecord(data.record ?? null)
    setLoading(false)
  }, [scope, topicId, date, hasRequiredFilters])

  useEffect(() => { fetchRecord() }, [fetchRecord])

  function handleExport(format: 'csv' | 'pdf') {
    const params = new URLSearchParams({ scope, topicId, date, format })
    window.open(`/api/reports/training-attendance?${params}`, '_blank')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Training Attendance Record</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Pick a training topic and date — everyone who completed it that day is listed below.
            Format QbD/QA/F/007-02
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={!hasRequiredFilters}
            className="px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 disabled:opacity-40"
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
            disabled={!hasRequiredFilters}
            className="px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 disabled:opacity-40"
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

      {/* Topic + date picker */}
      <div className="bg-white rounded-xl border p-4 mb-4 flex items-center gap-3 flex-wrap" style={{ borderColor: '#e5e7eb' }}>
        <select
          value={topicId}
          onChange={(e) => setTopicId(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb', minWidth: 240 }}
        >
          <option value="">Select training topic</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400">on</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        />
      </div>

      {!hasRequiredFilters ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-xl border" style={{ borderColor: '#e5e7eb' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          <p className="text-sm text-gray-400">Choose a topic and date to see who attended.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading attendance record...
        </div>
      ) : !record || record.attendees.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          No one completed this training on {formatDate(date)}.
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
          {/* Identification block */}
          <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-1" style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <div className="text-sm"><span className="text-gray-400">Topic of Training: </span><span className="font-semibold text-gray-900">{record.topicName}</span></div>
            <div className="text-sm"><span className="text-gray-400">Date of Training: </span><span className="font-semibold text-gray-900">{formatDate(record.date)}</span></div>
            <div className="text-sm"><span className="text-gray-400">Document No.: </span><span className="text-gray-700">{record.sopReference ?? '—'}</span></div>
            <div className="text-sm"><span className="text-gray-400">Name of the Trainer: </span><span className="text-gray-700">{record.trainerName ?? '—'}</span></div>
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Sr. No', 'Name of Trainee', 'Department', 'Sign/Date'].map((h, i) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    style={i === 0 ? { width: '60px' } : {}}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {record.attendees.map((a, idx) => (
                <tr key={a.personId} style={{ borderBottom: '1px solid #f3f4f6' }} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">{a.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{a.department ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-300">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
