'use client'

import { useState } from 'react'

interface ApprovalSignModalProps {
  isOpen:      boolean
  title:       string
  description: string
  error?:      string | null
  loading?:    boolean
  onConfirm:   (justification: string, password: string) => void
  onCancel:    () => void
  minLength?:  number
}

export function ApprovalSignModal({
  isOpen,
  title,
  description,
  error     = null,
  loading   = false,
  onConfirm,
  onCancel,
  minLength = 10,
}: ApprovalSignModalProps) {
  const [justification, setJustification] = useState('')
  const [password,      setPassword]      = useState('')

  const isValid = justification.trim().length >= minLength && password.length > 0

  function handleConfirm() {
    if (!isValid) return
    onConfirm(justification.trim(), password)
  }

  function handleCancel() {
    setJustification('')
    setPassword('')
    onCancel()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleCancel() }}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl"
        style={{ border: '1px solid #e5e7eb' }}
      >
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>

        <div className="px-6 py-4 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder={`Minimum ${minLength} characters...`}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none"
              style={{ borderColor: '#d1d5db' }}
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">
              {justification.trim().length} / min {minLength} characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirm your password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your account password"
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: '#d1d5db' }}
              autoComplete="current-password"
            />
          </div>

          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs"
            style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
          >
            <span>
              This is an electronic signature. Your justification and identity are
              permanently recorded in the audit trail (ALCOA+ compliance).
            </span>
          </div>

          {error && (
            <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid #f3f4f6' }}
        >
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium border"
            style={{ borderColor: '#e5e7eb', color: '#374151', background: '#fff' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid || loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: !isValid || loading ? '#9ca3af' : '#166534' }}
          >
            {loading ? 'Processing...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}
