'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

interface SectionOption {
  id:   string
  name: string
  unit: { name: string; department: { name: string } }
}

interface Bucket {
  month:       string
  monthLabel:  string
  attended:    number
  notAttended: number
}

const COLOR_ATTENDED     = '#2d6a4f'
const COLOR_NOT_ATTENDED = '#dc2626'
const BAR_AREA_HEIGHT    = 220 // px

export function AttendanceChart() {
  const [sections,  setSections]  = useState<SectionOption[]>([])
  const [sectionId, setSectionId] = useState('')
  const [buckets,   setBuckets]   = useState<Bucket[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showTable, setShowTable] = useState(false)
  const [hover,      setHover]    = useState<{ month: string; series: 'attended' | 'notAttended' } | null>(null)
  const [fromMonth,  setFromMonth] = useState('')
  const [toMonth,    setToMonth]   = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (sectionId) params.set('sectionId', sectionId)
    const res  = await fetch(`/api/reports/attendance-chart?${params}`)
    const data = await res.json()
    setSections(data.sections ?? [])
    setBuckets(data.buckets ?? [])
    setLoading(false)
  }, [sectionId])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredBuckets = useMemo(() => buckets.filter((b) =>
    (!fromMonth || b.month >= fromMonth) && (!toMonth || b.month <= toMonth)
  ), [buckets, fromMonth, toMonth])

  const maxTotal = useMemo(
    () => Math.max(1, ...filteredBuckets.map((b) => b.attended + b.notAttended)),
    [filteredBuckets]
  )

  const totals = useMemo(() => ({
    attended:    filteredBuckets.reduce((sum, b) => sum + b.attended, 0),
    notAttended: filteredBuckets.reduce((sum, b) => sum + b.notAttended, 0),
  }), [filteredBuckets])

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Training Attendance</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Month-wise attended vs not-attended, filterable by section.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: '#e5e7eb' }}
          >
            <option value="">All sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.unit.department.name} → {s.unit.name})
              </option>
            ))}
          </select>
          <input
            type="month"
            value={fromMonth}
            onChange={(e) => setFromMonth(e.target.value)}
            title="From month"
            className="px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: '#e5e7eb' }}
          />
          <input
            type="month"
            value={toMonth}
            onChange={(e) => setToMonth(e.target.value)}
            title="To month"
            className="px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: '#e5e7eb' }}
          />
          {(fromMonth || toMonth) && (
            <button
              onClick={() => { setFromMonth(''); setToMonth('') }}
              className="px-3 py-2 rounded-lg text-xs font-medium border"
              style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setShowTable((v) => !v)}
            className="px-3 py-2 rounded-lg border text-xs font-medium"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}
          >
            {showTable ? 'View as chart' : 'View as table'}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        {[
          { label: 'Attended',     color: COLOR_ATTENDED,     value: totals.attended },
          { label: 'Not attended', color: COLOR_NOT_ATTENDED, value: totals.notAttended },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-2 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: l.color }} />
            {l.label} <span className="text-gray-400">({l.value})</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading chart...
        </div>
      ) : filteredBuckets.length === 0 || filteredBuckets.every((b) => b.attended + b.notAttended === 0) ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          No assignments due in this window.
        </div>
      ) : showTable ? (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Month', 'Attended', 'Not attended', 'Total'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredBuckets.map((b) => (
                <tr key={b.month} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td className="px-4 py-3 text-gray-900">{b.monthLabel}</td>
                  <td className="px-4 py-3" style={{ color: COLOR_ATTENDED }}>{b.attended}</td>
                  <td className="px-4 py-3" style={{ color: COLOR_NOT_ATTENDED }}>{b.notAttended}</td>
                  <td className="px-4 py-3 text-gray-500">{b.attended + b.notAttended}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="bg-white rounded-xl border p-6"
          style={{ borderColor: '#e5e7eb' }}
        >
          <div className="flex items-end gap-4" style={{ height: BAR_AREA_HEIGHT + 40 }}>
            {filteredBuckets.map((b) => {
              const total          = b.attended + b.notAttended
              const totalHeight    = total === 0 ? 0 : Math.max(4, (total / maxTotal) * BAR_AREA_HEIGHT)
              const attendedHeight = total === 0 ? 0 : (b.attended / total) * totalHeight
              const notAttHeight   = total === 0 ? 0 : totalHeight - attendedHeight

              return (
                <div key={b.month} className="flex-1 flex flex-col items-center justify-end" style={{ height: BAR_AREA_HEIGHT + 40 }}>
                  <div className="relative flex flex-col justify-end" style={{ height: BAR_AREA_HEIGHT, width: '100%', maxWidth: 48 }}>
                    {total === 0 ? (
                      <div className="w-full rounded" style={{ height: 2, background: '#e5e7eb' }} />
                    ) : (
                      <>
                        {/* Not-attended segment (top) */}
                        {notAttHeight > 0 && (
                          <div
                            onMouseEnter={() => setHover({ month: b.month, series: 'notAttended' })}
                            onMouseLeave={() => setHover(null)}
                            className="w-full relative transition-opacity"
                            style={{
                              height:       notAttHeight,
                              background:   COLOR_NOT_ATTENDED,
                              borderRadius: attendedHeight > 0 ? '4px 4px 0 0' : '4px',
                              marginBottom: attendedHeight > 0 ? 2 : 0,
                              opacity: hover && hover.month === b.month && hover.series !== 'notAttended' ? 0.5 : 1,
                            }}
                          >
                            {hover?.month === b.month && hover.series === 'notAttended' && (
                              <div
                                className="absolute left-1/2 -translate-x-1/2 -top-7 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap z-10"
                                style={{ background: '#111827' }}
                              >
                                {b.notAttended} not attended
                              </div>
                            )}
                          </div>
                        )}
                        {/* Attended segment (bottom, anchored to baseline) */}
                        {attendedHeight > 0 && (
                          <div
                            onMouseEnter={() => setHover({ month: b.month, series: 'attended' })}
                            onMouseLeave={() => setHover(null)}
                            className="w-full relative transition-opacity"
                            style={{
                              height:       attendedHeight,
                              background:   COLOR_ATTENDED,
                              borderRadius: notAttHeight > 0 ? '0 0 4px 4px' : '4px',
                              opacity: hover && hover.month === b.month && hover.series !== 'attended' ? 0.5 : 1,
                            }}
                          >
                            {hover?.month === b.month && hover.series === 'attended' && (
                              <div
                                className="absolute left-1/2 -translate-x-1/2 -top-7 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap z-10"
                                style={{ background: '#111827' }}
                              >
                                {b.attended} attended
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 text-center">{b.monthLabel}</div>
                  <div className="text-xs text-gray-300">{total}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
