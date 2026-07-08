'use client'

import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [employeeId, setEmployeeId] = useState('')
  const [submitted,  setSubmitted]  = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // We do not expose whether the Employee ID exists or not
    // Training Coordinator resets passwords manually via /personnel
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#f4f6f8' }}>
      <div className="w-full max-w-sm">
        <a
        
          href="/login"
          className="text-sm flex items-center gap-1 mb-6"
          style={{ color: '#2d6a4f' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to login
        </a>

        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          Forgot password
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Password resets must be done by your Training Coordinator.
          Contact them with your Employee ID and they will reset your
          password from the Personnel module.
        </p>

        {submitted ? (
          <div
            className="px-4 py-4 rounded-xl border text-sm"
            style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}
          >
            <div className="font-semibold mb-1">Request noted</div>
            <div>
              Please contact your Training Coordinator directly and provide
              your Employee ID: <strong>{employeeId}</strong>.
              They will reset your password from the Admin panel.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your Employee ID
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                placeholder="e.g. EMP-001"
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                style={{ borderColor: '#d1d5db' }}
              />
            </div>

            <div
              className="text-xs px-4 py-3 rounded-xl"
              style={{ background: '#eff6ff', color: '#1d4ed8' }}
            >
              <strong>Why does this work this way?</strong> For GxP compliance,
              password resets must be authorised by the Training Coordinator
              and logged in the audit trail. Self-service reset is not permitted.
            </div>

            <button
              type="submit"
              disabled={!employeeId.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: '#2d6a4f' }}
            >
              Note my Employee ID
            </button>
          </form>
        )}
      </div>
    </div>
  )
}