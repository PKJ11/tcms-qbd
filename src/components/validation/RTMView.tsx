'use client'

import { useState, useEffect } from 'react'

interface TestCase {
  ursId:       string
  module:      string
  phase:       string
  priority:    string
  title:       string
  description: string
  results: { status: string; executedAt: string | null }[]
}

interface RTMData {
  summary: {
    total:      number
    byPhase:    Record<string, number>
    byStatus:   Record<string, number>
    byPriority: Record<string, number>
    passRate:   number
  }
  testCases: TestCase[]
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  PASS:         { bg: '#f0fdf4', color: '#166534', label: 'PASS'         },
  FAIL:         { bg: '#fef2f2', color: '#dc2626', label: 'FAIL'         },
  BLOCKED:      { bg: '#fff7ed', color: '#c2410c', label: 'BLOCKED'      },
  NOT_EXECUTED: { bg: '#f9fafb', color: '#9ca3af', label: 'NOT EXECUTED' },
}

const PHASE_COLORS: Record<string, { bg: string; color: string }> = {
  IQ: { bg: '#eff6ff', color: '#1d4ed8' },
  OQ: { bg: '#f5f3ff', color: '#6d28d9' },
  PQ: { bg: '#f0fdf4', color: '#166534' },
  RT: { bg: '#fff7ed', color: '#c2410c' },
}

export function RTMView() {
  const [data,        setData]        = useState<RTMData | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [phaseFilter, setPhaseFilter] = useState('')
  const [expanded,    setExpanded]    = useState<string | null>(null)

  useEffect(() => {
    async function fetch_() {
      setLoading(true)
      const res  = await fetch('/api/validation/rtm')
      const json = await res.json()
      setData(json)
      setLoading(false)
    }
    fetch_()
  }, [])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Loading RTM...
      </div>
    )
  }

  const filtered = data.testCases.filter(
    (tc) => !phaseFilter || tc.phase === phaseFilter
  )

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4 text-center" style={{ borderColor: '#e5e7eb' }}>
          <div className="text-2xl font-bold text-gray-900">{data.summary.total}</div>
          <div className="text-xs text-gray-400 mt-0.5">Total test cases</div>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center" style={{ borderColor: '#e5e7eb' }}>
          <div className="text-2xl font-bold" style={{ color: '#166534' }}>
            {data.summary.byStatus.PASS}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Passed</div>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center" style={{ borderColor: '#e5e7eb' }}>
          <div className="text-2xl font-bold" style={{ color: '#dc2626' }}>
            {data.summary.byStatus.FAIL}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Failed</div>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center" style={{ borderColor: '#e5e7eb' }}>
          <div className="text-2xl font-bold" style={{ color: '#2d6a4f' }}>
            {data.summary.passRate}%
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Pass rate</div>
        </div>
      </div>

      {/* Phase breakdown */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => setPhaseFilter('')}
          className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
          style={{
            background:  !phaseFilter ? '#2d6a4f' : '#fff',
            color:       !phaseFilter ? '#fff'    : '#6b7280',
            borderColor: !phaseFilter ? '#2d6a4f' : '#e5e7eb',
          }}
        >
          All ({data.summary.total})
        </button>
        {Object.entries(data.summary.byPhase).map(([phase, count]) => {
          const style = PHASE_COLORS[phase] ?? PHASE_COLORS.OQ
          const active = phaseFilter === phase
          return (
            <button
              key={phase}
              onClick={() => setPhaseFilter(phase)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
              style={{
                background:  active ? style.color : style.bg,
                color:       active ? '#fff'       : style.color,
                borderColor: active ? style.color  : 'transparent',
              }}
            >
              {phase} ({count})
            </button>
          )
        })}
      </div>

      {/* RTM table */}
      <div
        className="bg-white rounded-xl border overflow-hidden"
        style={{ borderColor: '#e5e7eb' }}
      >
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['URS ID', 'Module', 'Phase', 'P', 'Test title', 'Last result', ''].map((h) => (
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
            {filtered.map((tc :any) => {
              const lastResult   = tc.results[0]?.status ?? 'NOT_EXECUTED'
              const resultStyle  = STATUS_STYLES[lastResult] ?? STATUS_STYLES.NOT_EXECUTED
              const phaseStyle   = PHASE_COLORS[tc.phase]   ?? PHASE_COLORS.OQ
              const isExpanded   = expanded === tc.ursId + tc.title

              return (
                <>
                  <tr
                    key={tc.ursId + tc.title}
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      setExpanded(
                        isExpanded ? null : tc.ursId + tc.title
                      )
                    }
                  >
                    <td className="px-4 py-3">
                      <span
                        className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
                        style={{ background: '#fefce8', color: '#854d0e' }}
                      >
                        {tc.ursId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {tc.module.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={phaseStyle}
                      >
                        {tc.phase}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-bold"
                        style={{
                          color: tc.priority === 'M' ? '#dc2626'
                               : tc.priority === 'H' ? '#854d0e'
                               : '#6b7280',
                        }}
                      >
                        {tc.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-900">
                      {tc.title}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={resultStyle}
                      >
                        {resultStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {isExpanded ? '▲' : '▼'}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr
                      key={tc.ursId + tc.title + '-detail'}
                      style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}
                    >
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Description
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              {tc.description}
                            </p>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-3">
                              Expected result
                            </div>
                            <p
                              className="text-xs leading-relaxed px-3 py-2 rounded-lg"
                              style={{ background: '#f0fdf4', color: '#166534' }}
                            >
                              {tc.expected}
                            </p>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Test steps
                            </div>
                            <ol className="flex flex-col gap-1">
  {(() => {
    let steps: string[] = []
    try {
      steps = tc.steps ? JSON.parse(tc.steps) : []
    } catch {
      steps = []
    }
    return steps.map((step, i) => (
      <li
        key={i}
        className="flex items-start gap-2 text-xs text-gray-600"
      >
        <span
          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
          style={{ background: '#eff6ff', color: '#1d4ed8' }}
        >
          {i + 1}
        </span>
        {step}
      </li>
    ))
  })()}
</ol>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}