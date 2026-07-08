'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

interface Run {
  id:          string
  phase:       string
  version:     string
  environment: string
  status:      string
  startedAt:   string | null
  completedAt: string | null
  createdAt:   string
  executedBy:  { name: string } | null
  approvedBy:  { name: string } | null
  testResults: { status: string }[]
}

const PHASE_COLORS: Record<string, { bg: string; color: string }> = {
  IQ: { bg: '#eff6ff', color: '#1d4ed8' },
  OQ: { bg: '#f5f3ff', color: '#6d28d9' },
  PQ: { bg: '#f0fdf4', color: '#166534' },
  RT: { bg: '#fff7ed', color: '#c2410c' },
}

const ENV_COLORS: Record<string, { bg: string; color: string }> = {
  DEV:        { bg: '#fefce8', color: '#854d0e' },
  VALIDATION: { bg: '#eff6ff', color: '#1d4ed8' },
  PROD:       { bg: '#fef2f2', color: '#dc2626' },
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  PLANNED:     { bg: '#f9fafb', color: '#6b7280' },
  IN_PROGRESS: { bg: '#eff6ff', color: '#1d4ed8' },
  COMPLETE:    { bg: '#f0fdf4', color: '#166534' },
  LOCKED:      { bg: '#fef2f2', color: '#dc2626' },
}

export function ValidationRunsList() {
  const [runs,      setRuns]      = useState<Run[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showNew,   setShowNew]   = useState(false)
  const [newForm,   setNewForm]   = useState({
    phase:       'OQ',
    version:     'v0.1.0',
    environment: 'VALIDATION',
  })
  const [creating,  setCreating]  = useState(false)

  const fetchRuns = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/validation/runs')
    const data = await res.json()
    setRuns(data.runs ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchRuns() }, [fetchRuns])

  async function handleCreate() {
    setCreating(true)
    await fetch('/api/validation/runs', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(newForm),
    })
    setCreating(false)
    setShowNew(false)
    fetchRuns()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Validation Runs</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            IQ / OQ / PQ execution records. URS-VAL-001 to 004.
          </p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#2d6a4f' }}
        >
          {showNew ? 'Cancel' : '+ New validation run'}
        </button>
      </div>

      {/* New run form */}
      {showNew && (
        <div
          className="bg-white rounded-xl border p-5 mb-4"
          style={{ borderColor: '#e5e7eb' }}
        >
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phase</label>
              <select
                value={newForm.phase}
                onChange={(e) => setNewForm({ ...newForm, phase: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#d1d5db' }}
              >
                <option value="IQ">IQ — Installation Qualification</option>
                <option value="OQ">OQ — Operational Qualification</option>
                <option value="PQ">PQ — Performance Qualification</option>
                <option value="RT">RT — Regression Test</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Version</label>
              <input
                value={newForm.version}
                onChange={(e) => setNewForm({ ...newForm, version: e.target.value })}
                placeholder="v0.1.0"
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#d1d5db' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Environment</label>
              <select
                value={newForm.environment}
                onChange={(e) => setNewForm({ ...newForm, environment: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#d1d5db' }}
              >
                <option value="DEV">DEV — Development</option>
                <option value="VALIDATION">VALIDATION — Test environment</option>
                <option value="PROD">PROD — Production</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#2d6a4f' }}
            >
              {creating ? 'Creating...' : 'Create validation run'}
            </button>
          </div>
        </div>
      )}

      {/* Runs list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading validation runs...
        </div>
      ) : runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
          <p className="text-sm text-gray-400">No validation runs yet</p>
          <p className="text-xs text-gray-400">Create a new run to begin IQ/OQ/PQ execution</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {runs.map((run) => {
            const total       = run.testResults.length
            const passed      = run.testResults.filter((r) => r.status === 'PASS').length
            const failed      = run.testResults.filter((r) => r.status === 'FAIL').length
            const notExecuted = run.testResults.filter((r) => r.status === 'NOT_EXECUTED').length
            const passRate    = total > 0 && (total - notExecuted) > 0
              ? Math.round((passed / (total - notExecuted)) * 100)
              : 0

            const phaseStyle  = PHASE_COLORS[run.phase]    ?? PHASE_COLORS.OQ
            const envStyle    = ENV_COLORS[run.environment] ?? ENV_COLORS.DEV
            const statusStyle = STATUS_STYLES[run.status]  ?? STATUS_STYLES.PLANNED

            return (
              <a
                key={run.id}
                href={`/admin/validation/${run.id}`}
                className="bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow block"
                style={{ borderColor: '#e5e7eb' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={phaseStyle}
                      >
                        {run.phase}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={envStyle}
                      >
                        {run.environment}
                      </span>
                      <span className="font-mono text-xs text-gray-500">
                        {run.version}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={statusStyle}
                      >
                        {run.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Created {formatDate(run.createdAt)}
                      {run.executedBy && ` · Executed by ${run.executedBy.name}`}
                      {run.approvedBy && ` · Approved by ${run.approvedBy.name}`}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-gray-900">
                      {passed}/{total}
                    </div>
                    <div className="text-xs text-gray-400">test cases passed</div>
                    {failed > 0 && (
                      <div className="text-xs font-semibold mt-1" style={{ color: '#dc2626' }}>
                        {failed} failed
                      </div>
                    )}
                    {notExecuted > 0 && (
                      <div className="text-xs text-gray-400">
                        {notExecuted} pending
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {total > 0 && (
                  <div className="mt-3">
                    <div
                      className="w-full rounded-full h-1.5"
                      style={{ background: '#e5e7eb' }}
                    >
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width:      `${passRate}%`,
                          background: failed > 0 ? '#dc2626' : '#2d6a4f',
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {passRate}% pass rate · {total - notExecuted} of {total} executed
                    </div>
                  </div>
                )}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}