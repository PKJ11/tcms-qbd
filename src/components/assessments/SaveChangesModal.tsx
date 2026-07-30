'use client'

import { useState } from 'react'

export interface VersionSummary {
  id:           string
  versionNo:    number
  versionLabel: string
  createdAt:    string
  createdBy:    { id: string; name: string }
}

interface Diff {
  added:    number
  archived: number
  restored: number
  edited:   number
}

interface Props {
  isOpen:               boolean
  diff:                 Diff
  versions:             VersionSummary[]
  isBaseVersionUsed:    boolean
  onSave:               (versionLabel: string, justification: string) => void
  onApplyDirectly:      (justification: string) => void
  onUsePreviousVersion: (versionId: string) => void
  onCancel:             () => void
  loading?:             boolean
  error?:               string | null
}

export function SaveChangesModal({
  isOpen, diff, versions, isBaseVersionUsed, onSave, onApplyDirectly, onUsePreviousVersion, onCancel, loading = false, error = null,
}: Props) {
  const [mode, setMode] = useState<'save' | 'apply' | 'previous'>('save')
  const [versionLabel, setVersionLabel] = useState('')
  const [justification, setJustification] = useState('')
  const [selectedVersionId, setSelectedVersionId] = useState('')

  if (!isOpen) return null

  const hasChanges = diff.added + diff.archived + diff.restored + diff.edited > 0
  const canSave =
    mode === 'save'     ? versionLabel.trim().length > 0 && justification.trim().length >= 10 :
    mode === 'apply'     ? justification.trim().length >= 10 :
    selectedVersionId.length > 0

  function handleClose() {
    setMode('save')
    setVersionLabel('')
    setJustification('')
    setSelectedVersionId('')
    onCancel()
  }

  function handleConfirm() {
    if (!canSave) return
    if (mode === 'save') {
      onSave(versionLabel.trim(), justification.trim())
    } else if (mode === 'apply') {
      onApplyDirectly(justification.trim())
    } else {
      onUsePreviousVersion(selectedVersionId)
    }
  }

  const inputClass = "w-full px-3 py-2 rounded-lg border text-sm outline-none"
  const inputStyle = { borderColor: '#d1d5db' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl" style={{ border: '1px solid #e5e7eb' }}>
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
          <h3 className="text-base font-semibold text-gray-900">Save changes</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Nothing you staged is saved yet — choose how to commit it.
          </p>
        </div>

        <div className="px-6 py-4 flex flex-col gap-4">
          {/* Diff summary — the audit-trail preview of what will change */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {([
              ['Added', diff.added, '#166534', '#f0fdf4'],
              ['Archived', diff.archived, '#dc2626', '#fef2f2'],
              ['Restored', diff.restored, '#1d4ed8', '#eff6ff'],
              ['Edited', diff.edited, '#a16207', '#fefce8'],
            ] as const).map(([label, count, color, bg]) => (
              <div key={label} className="rounded-lg py-2" style={{ background: bg }}>
                <div className="text-lg font-bold" style={{ color }}>{count}</div>
                <div className="text-xs" style={{ color }}>{label}</div>
              </div>
            ))}
          </div>
          {!hasChanges && (
            <p className="text-xs text-gray-400 text-center">No changes staged since the last save.</p>
          )}

          {/* Mode switch */}
          <div className="flex rounded-lg border p-1 text-sm" style={{ borderColor: '#e5e7eb' }}>
            <button
              onClick={() => setMode('save')}
              className="flex-1 py-1.5 rounded-md font-medium"
              style={mode === 'save' ? { background: '#2d6a4f', color: '#fff' } : { color: '#6b7280' }}
            >
              Save as new version
            </button>
            {!isBaseVersionUsed && (
              <button
                onClick={() => setMode('apply')}
                className="flex-1 py-1.5 rounded-md font-medium"
                style={mode === 'apply' ? { background: '#2d6a4f', color: '#fff' } : { color: '#6b7280' }}
              >
                Apply to this version
              </button>
            )}
            <button
              onClick={() => setMode('previous')}
              className="flex-1 py-1.5 rounded-md font-medium"
              style={mode === 'previous' ? { background: '#2d6a4f', color: '#fff' } : { color: '#6b7280' }}
            >
              Use a previous version
            </button>
          </div>

          {mode === 'save' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  New version name <span className="text-red-500">*</span>
                </label>
                <input
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                  placeholder="e.g. 2.0"
                  className={inputClass}
                  style={inputStyle}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reason / Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Describe why this version is being saved..."
                  rows={3}
                  className={inputClass}
                  style={inputStyle}
                />
                <p className="text-xs text-gray-400 mt-1">Minimum 10 characters — permanently recorded in the audit trail.</p>
              </div>
            </>
          )}

          {mode === 'apply' && (
            <div>
              <p className="text-xs text-gray-400 mb-2">
                This version hasn't been assigned to anyone yet, so your changes can be written straight into it —
                no new version number, nothing else changes. Once this version is used by a training assignment,
                this option disappears and further changes require saving a new version.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reason / Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Describe why these changes are being applied..."
                rows={3}
                className={inputClass}
                style={inputStyle}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">Minimum 10 characters — permanently recorded in the audit trail.</p>
            </div>
          )}

          {mode === 'previous' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Load a previous version into the editor
              </label>
              <p className="text-xs text-gray-400 mb-2">
                This only changes what you're editing — no new version is created until you save again.
                Any new questions you've typed but not saved yet are kept; archive/restore/edit changes
                made against the current version are reset to match the one you pick.
              </p>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVersionId(v.id)}
                    className="text-left px-3 py-2 rounded-lg border text-sm flex items-center justify-between"
                    style={
                      selectedVersionId === v.id
                        ? { borderColor: '#2d6a4f', background: '#f0fdf4' }
                        : { borderColor: '#e5e7eb' }
                    }
                  >
                    <span>v{v.versionNo} — {v.versionLabel}</span>
                    <span className="text-xs text-gray-400">{v.createdBy.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #f3f4f6' }}>
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium border"
            style={{ borderColor: '#e5e7eb', color: '#374151', background: '#fff' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSave || loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: !canSave || loading ? '#9ca3af' : '#2d6a4f' }}
          >
            {loading
              ? (mode === 'apply' ? 'Applying...' : 'Saving...')
              : mode === 'save' ? 'Save version' : mode === 'apply' ? 'Apply changes' : 'Load version'}
          </button>
        </div>
      </div>
    </div>
  )
}
