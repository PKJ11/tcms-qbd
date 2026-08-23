'use client'

import { useEffect, useState } from 'react'
import { JustificationModal } from '@/components/JustificationModal'

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

export interface TopicAccessSummary {
  canEdit:   boolean
  ownerName: string
}

// Shows who owns this topic and who else can upload its training material
// and create/manage its assessment questions — one grant covers both. The
// owner (the trainer who created the topic) can grant/revoke access here;
// everyone else sees a read-only view of who currently has access.
export function TopicAccessPanel({
  topicId,
  onAccessChange,
}: {
  topicId: string
  onAccessChange?: (summary: TopicAccessSummary) => void
}) {
  const [access,  setAccess]  = useState<AccessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const [selectedTrainerId, setSelectedTrainerId] = useState('')

  // Both grant and revoke are audit-trailed actions — each needs a
  // justification, captured via the same modal used everywhere else.
  const [pendingAction, setPendingAction] = useState<
    { type: 'grant' } | { type: 'revoke'; personId: string; personName: string } | null
  >(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError,   setModalError]   = useState<string | null>(null)

  async function load() {
    const res  = await fetch(`/api/topics/${topicId}/collaborators`)
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
  }, [topicId])

  function startGrant() {
    if (!selectedTrainerId) return
    setModalError(null)
    setPendingAction({ type: 'grant' })
  }

  function startRevoke(personId: string, personName: string) {
    setModalError(null)
    setPendingAction({ type: 'revoke', personId, personName })
  }

  async function handleConfirm(justification: string) {
    if (!pendingAction) return
    setModalLoading(true)
    setModalError(null)

    const res = pendingAction.type === 'grant'
      ? await fetch(`/api/topics/${topicId}/collaborators`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ personId: selectedTrainerId, justification }),
        })
      : await fetch(`/api/topics/${topicId}/collaborators/${pendingAction.personId}`, {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ justification }),
        })

    const data = await res.json()
    setModalLoading(false)

    if (!res.ok) {
      setModalError(data.message ?? 'Action failed')
      return
    }

    setPendingAction(null)
    if (pendingAction.type === 'grant') setSelectedTrainerId('')
    await load()
  }

  if (loading || !access) return null

  return (
    <div className="bg-white rounded-2xl border p-6 mb-4" style={{ borderColor: '#e5e7eb' }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between text-left">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Access to this topic</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Controls who can upload material and create/manage assessment questions.
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
              Only {access.owner.name} can grant or revoke access to this topic.
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
                      onClick={() => startRevoke(c.person.id, c.person.name)}
                      className="px-2.5 py-1 rounded-lg border text-xs font-medium"
                      style={{ borderColor: '#fecaca', color: '#dc2626' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {access.isOwner && (
            <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: '#f3f4f6' }}>
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
                type="button"
                onClick={startGrant}
                disabled={!selectedTrainerId}
                className="px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-40"
                style={{ background: '#2d6a4f' }}
              >
                Grant access
              </button>
            </div>
          )}
        </div>
      )}

      <JustificationModal
        isOpen={!!pendingAction}
        title={
          pendingAction?.type === 'revoke'
            ? `Revoke ${pendingAction.personName}'s access`
            : 'Grant access to this topic'
        }
        description={
          pendingAction?.type === 'revoke'
            ? `${pendingAction.personName} will no longer be able to upload material or manage questions for this topic.`
            : 'This trainer will be able to upload material and create/manage assessment questions for this topic.'
        }
        onConfirm={handleConfirm}
        onCancel={() => setPendingAction(null)}
        loading={modalLoading}
        error={modalError}
      />
    </div>
  )
}
