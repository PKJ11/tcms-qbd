'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function ChangePasswordPage() {
  const router          = useRouter()
  const { data: session } = useSession()
  const [current,  setCurrent]  = useState('')
  const [newPass,  setNewPass]  = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPass.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPass !== confirm) {
      setError('New passwords do not match.')
      return
    }
    if (newPass === current) {
      setError('New password must be different from current password.')
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/change-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        currentPassword: current,
        newPassword:     newPass,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.message ?? 'Something went wrong.')
      return
    }

    setSuccess(true)
    // Sign out to clear the old JWT token, then redirect to login
    // so a fresh token is issued without mustChangePassword: true
    setTimeout(async () => {
      const { signOut } = await import('next-auth/react')
      await signOut({ redirect: false })
      router.push('/login')
    }, 1500)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#f4f6f8' }}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-8"
        style={{ borderColor: '#e5e7eb' }}
      >
        {/* Header */}
        <div className="mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: '#f0fdf4' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Set your password
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            You must set a new password before continuing.
          </p>
        </div>

        {success ? (
          <div
            className="text-sm px-4 py-3 rounded-lg text-center font-medium"
            style={{ background: '#f0fdf4', color: '#166534' }}
          >
            ✅ Password changed successfully. Redirecting...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Current password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#d1d5db' }}
                onFocus={(e) => e.target.style.borderColor = '#2d6a4f'}
                onBlur={(e)  => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            {/* New password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#d1d5db' }}
                onFocus={(e) => e.target.style.borderColor = '#2d6a4f'}
                onBlur={(e)  => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#d1d5db' }}
                onFocus={(e) => e.target.style.borderColor = '#2d6a4f'}
                onBlur={(e)  => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            {error && (
              <div
                className="text-sm px-4 py-3 rounded-lg border"
                style={{
                  background:  '#fef2f2',
                  borderColor: '#fecaca',
                  color:       '#dc2626',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white text-sm font-semibold mt-2"
              style={{ background: loading ? '#4a9e6f' : '#2d6a4f' }}
            >
              {loading ? 'Updating...' : 'Set new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}