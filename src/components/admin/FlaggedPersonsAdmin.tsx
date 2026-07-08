'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

interface FlaggedPerson {
  id:             string
  name:           string
  employeeId:     string
  designation:    string
  flaggedAt:      string | null
  flagReason:     string | null
  flagCycleCount: number | null
  flagTopicId:    string | null
  flagTopicName:  string | null
  department:     { name: string } | null
  manager:        { name: string } | null
}

type ActionType = 'REASSIGNED' | 'OVERRIDE'

export function FlaggedPersonsAdmin() {
  const [persons,         setPersons]         = useState<FlaggedPerson[]>([])
  const [loading,         setLoading]         = useState(true)
  const [activeAction,    setActiveAction]    = useState<{
    person: FlaggedPerson
    type:   ActionType
  } | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [justification,   setJustification]   = useState('')
  const [submitting,      setSubmitting]      = useState(false)
  const [error,           setError]           = useState<string | null>(null)

  const fetchFlagged = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/admin/flagged-persons')
    const data = await res.json()
    setPersons(data.persons ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchFlagged() }, [fetchFlagged])

  function openAction(person: FlaggedPerson, type: ActionType) {
    setActiveAction({ person, type })
    setResolutionNotes('')
    setJustification('')
    setError(null)
  }

  function closeAction() {
    setActiveAction(null)
    setResolutionNotes('')
    setJustification('')
    setError(null)
  }

  async function handleResolve() {
    if (!activeAction) return

    if (resolutionNotes.trim().length < 10) {
      setError('Resolution notes must be at least 10 characters')
      return
    }
    if (justification.trim().length < 30) {
      setError('Justification must be at least 30 characters for this action')
      return
    }

    setSubmitting(true)
    setError(null)

    const res = await fetch(
      `/api/admin/flagged-persons/${activeAction.person.id}/resolve`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:          activeAction.type,
          resolutionNotes: resolutionNotes.trim(),
          justification:   justification.trim(),
        }),
      }
    )

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(data.message ?? 'Action failed')
      return
    }

    closeAction()
    fetchFlagged()
  }

  if (!loading && persons.length === 0) return null

  return (
    <>
      <div
        className="bg-white rounded-2xl border p-6"
        style={{ borderColor: '#e5e7eb' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#fef2f2' }}
          >
            <svg
              width="18" height="18"
              viewBox="0 0 24 24" fill="none"
              stroke="#dc2626" strokeWidth="2"
            >
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
              These analysts have failed to achieve competency after 3 complete
              retraining cycles. Per SOP QbD-QA-SOP-007 Section 5.11, job
              responsibilities must be reviewed. Take action on each person.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading flagged persons...</p>
        ) : (
          <div className="flex flex-col gap-3">
            {persons.map((person) => (
              <div
                key={person.id}
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: '#fecaca' }}
              >
                {/* Person header */}
                <div
                  className="p-4"
                  style={{ background: '#fef2f2' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">

                      {/* Name + ID */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-gray-900">
                          {person.name}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: '#fff', color: '#6b7280' }}
                        >
                          {person.employeeId}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                        >
                          🚨 Flagged
                        </span>
                      </div>

                      {/* Designation + Department */}
                      <div className="text-xs text-gray-600 mb-2">
                        {person.designation}
                        {person.department && ` · ${person.department.name}`}
                        {person.manager && ` · Reports to: ${person.manager.name}`}
                      </div>

                      {/* Topic + Cycle details */}
                      <div
                        className="flex flex-wrap gap-4 text-xs p-3 rounded-lg"
                        style={{ background: '#fff' }}
                      >
                        <div>
                          <div className="text-gray-400 mb-0.5">Failed topic</div>
                          <div className="font-semibold text-gray-900">
                            {person.flagTopicName ?? 'Unknown topic'}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 mb-0.5">Retraining cycles</div>
                          <div className="font-semibold" style={{ color: '#dc2626' }}>
                            {person.flagCycleCount ?? 3} of 3 completed
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 mb-0.5">Flagged on</div>
                          <div className="font-semibold text-gray-900">
                            {person.flaggedAt ? formatDate(person.flaggedAt) : '—'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* View profile link */}
                    <a
                      href={`/personnel/${person.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border flex-shrink-0"
                      style={{ borderColor: '#e5e7eb', color: '#374151' }}
                    >
                      View profile
                    </a>
                  </div>
                </div>

                {/* SOP reference */}
                <div
                  className="px-4 py-2 text-xs"
                  style={{ background: '#fff7ed', color: '#854d0e', borderTop: '1px solid #fed7aa' }}
                >
                  <strong>SOP QbD-QA-SOP-007 Section 5.11:</strong> "If the person is not trained after 3 retraining cycles, then change the job responsibilities and provide training on relevant SOPs."
                </div>

                {/* Action buttons */}
                <div
                  className="px-4 py-3 flex items-center gap-3"
                  style={{ borderTop: '1px solid #fecaca', background: '#fff' }}
                >
                  <span className="text-xs text-gray-500 flex-1">
                    Select the appropriate action per SOP:
                  </span>
                  <button
                    onClick={() => openAction(person, 'REASSIGNED')}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                    style={{ background: '#dc2626' }}
                  >
                    📋 Change job responsibilities
                  </button>
                  <button
                    onClick={() => openAction(person, 'OVERRIDE')}
                    className="px-4 py-2 rounded-lg text-xs font-semibold border"
                    style={{ borderColor: '#2d6a4f', color: '#2d6a4f' }}
                  >
                    🔄 Grant one more chance
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution modal */}
      {activeAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border overflow-hidden"
            style={{ borderColor: '#e5e7eb' }}
          >
            {/* Modal header */}
            <div
              className="px-6 py-4 border-b"
              style={{
                background:   activeAction.type === 'REASSIGNED' ? '#fef2f2' : '#f0fdf4',
                borderColor:  activeAction.type === 'REASSIGNED' ? '#fecaca' : '#bbf7d0',
              }}
            >
              <h3 className="text-base font-bold text-gray-900">
                {activeAction.type === 'REASSIGNED'
                  ? '📋 Change job responsibilities'
                  : '🔄 Grant one more training chance'}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                {activeAction.person.name} ({activeAction.person.employeeId})
                {' · '}
                {activeAction.person.flagTopicName ?? 'Unknown topic'}
              </p>
            </div>

            {/* Modal body */}
            <div className="px-6 py-4 flex flex-col gap-4">

              {/* Action explanation */}
              <div
                className="text-xs px-4 py-3 rounded-lg"
                style={{
                  background: activeAction.type === 'REASSIGNED' ? '#fef2f2' : '#f0fdf4',
                  color:      activeAction.type === 'REASSIGNED' ? '#991b1b' : '#166534',
                }}
              >
                {activeAction.type === 'REASSIGNED' ? (
                  <>
                    <strong>Change job responsibilities:</strong> This analyst will not
                    receive further training on this topic. Their job responsibilities
                    will be updated to remove tasks requiring this competency.
                    The person will be notified and instructed to speak with their manager.
                  </>
                ) : (
                  <>
                    <strong>Grant override:</strong> This analyst will receive one additional
                    training assignment with a 21-day deadline. This is an exception to the
                    standard SOP process and requires strong justification.
                    A mandatory 30-character minimum justification is enforced.
                  </>
                )}
              </div>

              {/* Resolution notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Resolution notes <span className="text-red-500">*</span>
                  <span className="text-xs font-normal text-gray-400 ml-2">
                    (what specific action is being taken)
                  </span>
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder={
                    activeAction.type === 'REASSIGNED'
                      ? 'e.g. Person reassigned from QC Analyst to Documentation role. Training on relevant documentation SOPs to be arranged...'
                      : 'e.g. Person showed improvement in last cycle. Additional coaching session arranged before next attempt...'
                  }
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none"
                  style={{ borderColor: '#d1d5db' }}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {resolutionNotes.trim().length} / min 10 characters
                </p>
              </div>

              {/* Justification — mandatory GxP requirement */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Justification <span className="text-red-500">*</span>
                  <span className="text-xs font-normal text-gray-400 ml-2">
                    (audit trail — min 30 characters)
                  </span>
                </label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Regulatory justification for this decision, per ALCOA+ requirements..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none"
                  style={{ borderColor: '#d1d5db' }}
                  autoFocus
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-400">
                    {justification.trim().length} / min 30 characters
                  </p>
                  {justification.trim().length >= 30 && (
                    <p className="text-xs" style={{ color: '#166534' }}>✓ Sufficient</p>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="text-sm px-4 py-3 rounded-lg border"
                  style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}
                >
                  {error}
                </div>
              )}

              {/* ALCOA notice */}
              <div
                className="text-xs px-3 py-2 rounded-lg"
                style={{ background: '#f9fafb', color: '#6b7280' }}
              >
                ⚖️ This action will be permanently recorded in the audit trail
                per 21 CFR Part 11 / EU GMP Annex 11. It cannot be undone.
              </div>
            </div>

            {/* Modal footer */}
            <div
              className="flex items-center justify-end gap-3 px-6 py-4 border-t"
              style={{ borderColor: '#f3f4f6' }}
            >
              <button
                onClick={closeAction}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm border font-medium"
                style={{ borderColor: '#e5e7eb', color: '#374151' }}
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={
                  submitting ||
                  resolutionNotes.trim().length < 10 ||
                  justification.trim().length < 30
                }
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                style={{
                  background: activeAction.type === 'REASSIGNED' ? '#dc2626' : '#2d6a4f',
                }}
              >
                {submitting
                  ? 'Processing...'
                  : activeAction.type === 'REASSIGNED'
                  ? 'Confirm job responsibility change'
                  : 'Confirm override — create assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}