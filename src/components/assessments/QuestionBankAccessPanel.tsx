'use client'

import { useEffect, useState } from 'react'

interface Collaborator {
  id:        string
  createdAt: string
  person:    { id: string; name: string; employeeId: string }
  addedBy:   { id: string; name: string }
}

interface TrainerOption {
  id:         string
  name:       string
  employeeId: string
}

interface AccessData {
  owner:             { id: string; name: string; employeeId: string }
  isOwner:           boolean
  canEdit:           boolean
  collaborators:     Collaborator[]
  availableTrainers: TrainerOption[]
}

export interface AccessSummary {
  canEdit:   boolean
  ownerName: string
}

// Shows who owns a topic's question bank and who else can edit it. The
// owner (the trainer who created the topic) can grant/revoke access here —
// everyone else sees a read-only view of who currently has access.
export function QuestionBankAccessPanel({
  bankId,
  onAccessChange,
}: {
  bankId: string
  onAccessChange?: (summary: AccessSummary) => void
}) {
  const [access,  setAccess]  = useState<AccessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const [selectedTrainerId, setSelectedTrainerId] = useState('')
  const [grantLoading, setGrantLoading] = useState(false)
  const [grantError,   setGrantError]   = useState<string | null>(null)
  const [revokeLoadingId, setRevokeLoadingId] = useState<string | null>(null)

  async function load() {
    const res  = await fetch(`/api/assessments/banks/${bankId}/collaborators`)
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setAccess(data)
      onAccessChange?.({ canEdit: data.canEdit, ownerName: data.owner.name })
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankId])

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTrainerId) return
    setGrantLoading(true)
    setGrantError(null)

    const res  = await fetch(`/api/assessments/banks/${bankId}/collaborators`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ personId: selectedTrainerId }),
    })
    const data = await res.json()
    setGrantLoading(false)

    if (!res.ok) {
      setGrantError(data.message ?? 'Failed to grant access')
      return
    }
    setSelectedTrainerId('')
    await load()
  }

  async function handleRevoke(personId: string) {
    setRevokeLoadingId(personId)
    const res = await fetch(`/api/assessments/banks/${bankId}/collaborators/${personId}`, { method: 'DELETE' })
    setRevokeLoadingId(null)
    if (res.ok) await load()
  }

  if (loading || !access) return null

  return (
    <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e5e7eb' }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between text-left">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Question bank access</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Owned by <span className="font-medium text-gray-600">{access.owner.name}</span>
            {access.collaborators.length > 0 && (
              <> · {access.collaborators.length} trainer{access.collaborators.length > 1 ? 's' : ''} granted access</>
            )}
          </p>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {expanded && (
        <div className="mt-4 flex flex-col gap-3">
          {!access.isOwner && (
            <p className="text-xs text-gray-400">
              Only {access.owner.name} can grant or revoke access to this question bank.
            </p>
          )}

          {access.collaborators.length === 0 ? (
            <p className="text-sm text-gray-400">No trainers have been granted access yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {access.collaborators.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{ background: '#fafafa' }}
                >
                  <div>
                    <span className="text-sm text-gray-900">{c.person.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{c.person.employeeId} · granted by {c.addedBy.name}</span>
                  </div>
                  {access.isOwner && (
                    <button
                      onClick={() => handleRevoke(c.person.id)}
                      disabled={revokeLoadingId === c.person.id}
                      className="px-2.5 py-1 rounded-lg border text-xs font-medium"
                      style={{ borderColor: '#fecaca', color: '#dc2626' }}
                    >
                      {revokeLoadingId === c.person.id ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {access.isOwner && (
            <form onSubmit={handleGrant} className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: '#f3f4f6' }}>
              <select
                value={selectedTrainerId}
                onChange={(e) => setSelectedTrainerId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#d1d5db' }}
              >
                <option value="">
                  {access.availableTrainers.length === 0 ? 'No other trainers available' : 'Select a trainer to grant access...'}
                </option>
                {access.availableTrainers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.employeeId})</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!selectedTrainerId || grantLoading}
                className="px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-40"
                style={{ background: '#2d6a4f' }}
              >
                {grantLoading ? 'Granting...' : 'Grant access'}
              </button>
            </form>
          )}

          {grantError && (
            <div className="text-sm px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>
              {grantError}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
