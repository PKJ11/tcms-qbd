'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/utils'

// ── Types match EXACTLY what Prisma returns from getValidationRunDetail ──

interface TestCase {
  id:          string
  ursId:       string
  module:      string
  title:       string
  description: string
  steps:       string   // JSON-stringified array
  expected:    string
  priority:    string
  // phase and results are NOT selected in the nested query
  // so they are NOT in this interface
}

interface TestResult {
  id:             string
  status:         string
  actualResult:   string | null
  defectNotes:    string | null
  executedAt:     Date | string | null
  executedBy:     { name: string } | null
  screenshotUrls: string[]
  testCase:       TestCase
}

interface Run {
  id:          string
  phase:       string
  version:     string
  environment: string
  status:      string
  notes:       string | null
  executedBy:  { id: string; name: string } | null
  approvedBy:  { id: string; name: string } | null
  testResults: TestResult[]
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  PASS:         { bg: '#f0fdf4', color: '#166534', label: 'PASS'         },
  FAIL:         { bg: '#fef2f2', color: '#dc2626', label: 'FAIL'         },
  BLOCKED:      { bg: '#fff7ed', color: '#c2410c', label: 'BLOCKED'      },
  NOT_EXECUTED: { bg: '#f9fafb', color: '#9ca3af', label: 'NOT EXECUTED' },
}

export function ValidationRunDetail({ run }: { run: Run }) {
  const [results,      setResults]      = useState<TestResult[]>(run.testResults)
  const [expanded,     setExpanded]     = useState<string | null>(null)
  const [form,         setForm]         = useState({
    status:       'PASS',
    actualResult: '',
    defectNotes:  '',
  })
  const [completing,   setCompleting]   = useState(false)
  const [completedMsg, setCompletedMsg] = useState<string | null>(null)

  const passed      = results.filter((r) => r.status === 'PASS').length
  const failed      = results.filter((r) => r.status === 'FAIL').length
  const blocked     = results.filter((r) => r.status === 'BLOCKED').length
  const notExecuted = results.filter((r) => r.status === 'NOT_EXECUTED').length
  const total       = results.length

  async function handleExecute(resultId: string) {
    if (!form.actualResult.trim()) return

    await fetch(`/api/validation/results/${resultId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    })

    setResults((prev) =>
      prev.map((r) =>
        r.id === resultId
          ? {
              ...r,
              status:       form.status,
              actualResult: form.actualResult,
              defectNotes:  form.defectNotes || null,
              executedAt:   new Date().toISOString(),
            }
          : r
      )
    )

    setForm({ status: 'PASS', actualResult: '', defectNotes: '' })
  }

  async function handleComplete() {
    setCompleting(true)
    const res  = await fetch(`/api/validation/runs/${run.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        notes: `Validation run completed by QA on ${new Date().toLocaleDateString('en-IN')}`,
      }),
    })
    const data = await res.json()
    setCompleting(false)

    if (data.hasFailures) {
      setCompletedMsg(
        'Run completed with failures. Defects must be resolved before system can be approved.'
      )
    } else {
      setCompletedMsg(
        '✅ All test cases passed. Validation run complete. System approved for use.'
      )
    }
  }

  function parseSteps(steps: string): string[] {
    try {
      return JSON.parse(steps)
    } catch {
      return []
    }
  }

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total',        value: total,       color: '#374151' },
          { label: 'Passed',       value: passed,      color: '#166534' },
          { label: 'Failed',       value: failed,      color: '#dc2626' },
          { label: 'Blocked',      value: blocked,     color: '#c2410c' },
          { label: 'Not executed', value: notExecuted, color: '#9ca3af' },
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

      {/* Complete run button */}
      {notExecuted === 0 && run.status !== 'COMPLETE' && !completedMsg && (
        <div
          className="bg-white rounded-xl border p-4 mb-6 flex items-center justify-between"
          style={{ borderColor: '#bbf7d0' }}
        >
          <div>
            <div className="text-sm font-semibold text-gray-900">
              All test cases executed
            </div>
            <div className="text-xs text-gray-500">
              {failed > 0
                ? `${failed} failures must be resolved before final approval`
                : 'Ready to mark this validation run as complete'}
            </div>
          </div>
          <button
            onClick={handleComplete}
            disabled={completing}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: failed > 0 ? '#dc2626' : '#2d6a4f' }}
          >
            {completing ? 'Completing...' : 'Complete & approve run'}
          </button>
        </div>
      )}

      {/* Completion message */}
      {completedMsg && (
        <div
          className="rounded-xl border p-4 mb-6 text-sm font-medium"
          style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}
        >
          {completedMsg}
        </div>
      )}

      {/* Test results list */}
      <div className="flex flex-col gap-2">
        {results.map((result) => {
          const statusStyle = STATUS_STYLES[result.status] ?? STATUS_STYLES.NOT_EXECUTED
          const isExp       = expanded === result.id

          return (
            <div
              key={result.id}
              className="bg-white rounded-xl border overflow-hidden"
              style={{ borderColor: result.status === 'FAIL' ? '#fecaca' : '#e5e7eb' }}
            >
              {/* Header row */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpanded(isExp ? null : result.id)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span
                    className="font-mono text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0"
                    style={{ background: '#fefce8', color: '#854d0e' }}
                  >
                    {result.testCase.ursId}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {result.testCase.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {result.testCase.module.replace(/_/g, ' ')}
                      {result.executedAt && (
                        <>
                          {' · Executed '}
                          {formatDate(result.executedAt as string)}
                          {result.executedBy && ` by ${result.executedBy.name}`}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={statusStyle}
                  >
                    {statusStyle.label}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {isExp ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Expanded detail */}
              {isExp && (
                <div
                  className="px-4 pb-4"
                  style={{ borderTop: '1px solid #f3f4f6' }}
                >
                  <div className="grid grid-cols-2 gap-4 mt-3">

                    {/* Steps */}
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Test steps
                      </div>
                      <ol className="flex flex-col gap-1">
                        {parseSteps(result.testCase.steps).map((step, i) => (
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
                        ))}
                      </ol>
                    </div>

                    {/* Expected + Actual */}
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Expected result
                      </div>
                      <p
                        className="text-xs rounded-lg px-3 py-2 mb-3"
                        style={{ background: '#f0fdf4', color: '#166534' }}
                      >
                        {result.testCase.expected}
                      </p>

                      {result.actualResult && (
                        <>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Actual result
                          </div>
                          <p
                            className="text-xs rounded-lg px-3 py-2"
                            style={{
                              background: result.status === 'PASS' ? '#f0fdf4' : '#fef2f2',
                              color:      result.status === 'PASS' ? '#166534' : '#dc2626',
                            }}
                          >
                            {result.actualResult}
                          </p>
                        </>
                      )}

                      {result.defectNotes && (
                        <>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-3">
                            Defect notes
                          </div>
                          <p
                            className="text-xs rounded-lg px-3 py-2"
                            style={{ background: '#fff7ed', color: '#c2410c' }}
                          >
                            {result.defectNotes}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Execution form — only for NOT_EXECUTED results */}
                  {result.status === 'NOT_EXECUTED' && run.status !== 'COMPLETE' && (
                    <div
                      className="mt-4 p-4 rounded-xl border"
                      style={{ background: '#fafafa', borderColor: '#e5e7eb' }}
                    >
                      <div className="text-xs font-semibold text-gray-600 mb-3">
                        Record test execution
                      </div>

                      {/* Pass / Fail / Blocked selector */}
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        {(['PASS', 'FAIL', 'BLOCKED'] as const).map((s) => {
                          const st = STATUS_STYLES[s]
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setForm({ ...form, status: s })}
                              className="py-2 rounded-lg border text-xs font-semibold transition-all"
                              style={{
                                background:  form.status === s ? st.color : st.bg,
                                color:       form.status === s ? '#fff'   : st.color,
                                borderColor: form.status === s ? st.color : 'transparent',
                              }}
                            >
                              {s}
                            </button>
                          )
                        })}
                      </div>

                      <textarea
                        value={form.actualResult}
                        onChange={(e) =>
                          setForm({ ...form, actualResult: e.target.value })
                        }
                        placeholder="Actual result observed during test execution..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border text-xs outline-none resize-none mb-2"
                        style={{ borderColor: '#d1d5db' }}
                      />

                      {form.status !== 'PASS' && (
                        <textarea
                          value={form.defectNotes}
                          onChange={(e) =>
                            setForm({ ...form, defectNotes: e.target.value })
                          }
                          placeholder="Defect description or blocker reason..."
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg border text-xs outline-none resize-none mb-2"
                          style={{ borderColor: '#d1d5db' }}
                        />
                      )}

                      <button
                        onClick={() => handleExecute(result.id)}
                        disabled={!form.actualResult.trim()}
                        className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-40"
                        style={{ background: '#2d6a4f' }}
                      >
                        Record result
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}