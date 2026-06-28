'use client'

import { useState } from 'react'

interface JustificationModalProps {
  isOpen:      boolean
  title:       string
  description: string
  onConfirm:   (justification: string) => void
  onCancel:    () => void
  loading?:    boolean
  minLength?:  number
}

export function JustificationModal({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
  loading   = false,
  minLength = 10,
}: JustificationModalProps) {
  const [text, setText] = useState('')

  const isValid  = text.trim().length >= minLength
  const charsLeft = minLength - text.trim().length

  function handleConfirm() {
    if (!isValid) return
    onConfirm(text.trim())
    setText('')
  }

  function handleCancel() {
    setText('')
    onCancel()
  }

  if (!isOpen) return null

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCancel()
      }}
    >
      {/* Modal */}
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl"
        style={{ border: '1px solid #e5e7eb' }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 pt-6 pb-4"
          style={{ borderBottom: '1px solid #f3f4f6' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: '#fefce8' }}
            >
              <svg
                width="18" height="18"
                viewBox="0 0 24 24" fill="none"
                stroke="#ca8a04" strokeWidth="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {title}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {description}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Reason / Justification
            <span className="text-red-500 ml-1">*</span>
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe why this action is being performed..."
            rows={4}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none transition-all"
            style={{
              borderColor: text.trim().length > 0 && !isValid
                ? '#fca5a5'
                : '#d1d5db',
              background: '#fff',
              color:      '#111827',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2d6a4f'
              e.target.style.boxShadow   = '0 0 0 3px rgba(45,106,79,0.12)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = text.trim().length > 0 && !isValid
                ? '#fca5a5'
                : '#d1d5db'
              e.target.style.boxShadow = 'none'
            }}
            autoFocus
          />

          {/* Character count / validation hint */}
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs text-gray-400">
              {!isValid && text.trim().length > 0
                ? `${charsLeft} more character${charsLeft !== 1 ? 's' : ''} required`
                : isValid
                ? '✓ Justification recorded'
                : `Minimum ${minLength} characters required`}
            </p>
            <p className="text-xs text-gray-400">
              {text.trim().length} chars
            </p>
          </div>

          {/* ALCOA notice */}
          <div
            className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-lg text-xs"
            style={{
              background:  '#f0fdf4',
              color:       '#166534',
              border:      '1px solid #bbf7d0',
            }}
          >
            <svg
              className="flex-shrink-0 mt-0.5"
              width="12" height="12"
              viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>
              This justification is permanently recorded in the
              audit trail and cannot be edited (ALCOA+ compliance).
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid #f3f4f6' }}
        >
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{
              borderColor: '#e5e7eb',
              color:       '#374151',
              background:  '#fff',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid || loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all flex items-center gap-2"
            style={{
              background: !isValid || loading ? '#9ca3af' : '#2d6a4f',
              cursor:     !isValid || loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin"
                  width="14" height="14"
                  viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                >
                  <path d="M21 12a9 9 0 00-9-9" />
                </svg>
                Processing...
              </>
            ) : (
              'Confirm action'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}