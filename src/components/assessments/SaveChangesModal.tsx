'use client'

import { useState } from 'react'

interface Diff {
  added:    number
  archived: number
  restored: number
  edited:   number
}

interface Props {
  isOpen:    boolean
  diff:      Diff
  onSave:    (justification: string) => void
  onCancel:  () => void
  loading?:  boolean
  error?:    string | null
}

export function SaveChangesModal({
  isOpen, diff, onSave, onCancel, loading = false, error = null,
}: Props) {
  const [justification, setJustification] = useState('')

  if (!isOpen) return null

  const canSave = justification.trim().length >= 10

  function handleClose() {
    setJustification('')
    onCancel()
  }

  function handleConfirm() {
    if (!canSave) return
    onSave(justification.trim())
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
            This will create the next version automatically.
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
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">Minimum 10 characters — permanently recorded in the audit trail.</p>
          </div>

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
            {loading ? 'Saving...' : 'Save version'}
          </button>
        </div>
      </div>
    </div>
  )
}
