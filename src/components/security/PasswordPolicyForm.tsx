'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'
import type { PasswordPolicyValues } from '@/modules/password-policy'

export function PasswordPolicyForm({ initial }: { initial: PasswordPolicyValues }) {
  const router = useRouter()

  const [form, setForm] = useState<PasswordPolicyValues>(initial)
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const dirty = JSON.stringify(form) !== JSON.stringify(initial)

  function num(v: string) {
    return v === '' ? 0 : Math.max(0, Math.floor(Number(v) || 0))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setConfirming(true)
  }

  async function handleConfirm(justification: string, password?: string) {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/password-policy', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...form, justification, password }),
    })
    const data = await res.json().catch(() => ({}))

    setLoading(false)
    setConfirming(false)

    if (!res.ok) {
      setError(data.message ?? 'Failed to update password policy.')
      return
    }

    setSaved(true)
    router.refresh()
  }

  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'
  const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm outline-none'
  const inputStyle = { borderColor: '#d1d5db', background: '#fff' }

  return (
    <>
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl border p-6"
        style={{ borderColor: '#e5e7eb' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Policy Name */}
          <div>
            <label className={labelClass}>Policy Name <span className="text-red-500">*</span></label>
            <input
              className={inputClass}
              style={inputStyle}
              value={form.policyName}
              onChange={(e) => setForm((f) => ({ ...f, policyName: e.target.value }))}
              required
            />
          </div>

          {/* Auth Mode — DB only */}
          <div>
            <label className={labelClass}>Auth Mode <span className="text-red-500">*</span></label>
            <input
              className={inputClass}
              style={{ ...inputStyle, background: '#f9fafb', color: '#6b7280' }}
              value="DB"
              readOnly
            />
          </div>

          {/* Password Expiry Days */}
          <div>
            <label className={labelClass}>Password Expiry Days <span className="text-red-500">*</span></label>
            <input
              type="number"
              min={1}
              className={inputClass}
              style={inputStyle}
              value={form.passwordExpiryDays}
              onChange={(e) => setForm((f) => ({ ...f, passwordExpiryDays: num(e.target.value) }))}
              required
            />
          </div>

          {/* Failed Password Attempt */}
          <div>
            <label className={labelClass}>Failed Password Attempt <span className="text-red-500">*</span></label>
            <input
              type="number"
              min={1}
              className={inputClass}
              style={inputStyle}
              value={form.failedAttemptLimit}
              onChange={(e) => setForm((f) => ({ ...f, failedAttemptLimit: num(e.target.value) }))}
              required
            />
          </div>

          {/* Minimum Password Length */}
          <div>
            <label className={labelClass}>Minimum Password Length <span className="text-red-500">*</span></label>
            <input
              type="number"
              min={6}
              className={inputClass}
              style={inputStyle}
              value={form.minPasswordLength}
              onChange={(e) => setForm((f) => ({ ...f, minPasswordLength: num(e.target.value) }))}
              required
            />
          </div>

          {/* Last Password Used */}
          <div>
            <label className={labelClass}>Last Password Used <span className="text-red-500">*</span></label>
            <input
              type="number"
              min={1}
              className={inputClass}
              style={inputStyle}
              value={form.passwordHistoryCount}
              onChange={(e) => setForm((f) => ({ ...f, passwordHistoryCount: num(e.target.value) }))}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              A new password cannot match any of the user&apos;s last {form.passwordHistoryCount || 1} passwords.
            </p>
          </div>
        </div>

        {error && (
          <div
            className="text-sm px-4 py-3 rounded-lg border mt-4"
            style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}
          >
            {error}
          </div>
        )}
        {saved && !dirty && (
          <div
            className="text-sm px-4 py-3 rounded-lg mt-4"
            style={{ background: '#f0fdf4', color: '#166534' }}
          >
            Password policy updated.
          </div>
        )}

        <div className="flex items-center gap-3 mt-6">
          <button
            type="submit"
            disabled={!dirty || loading}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: !dirty || loading ? '#9ca3af' : '#2d6a4f' }}
          >
            {loading ? 'Updating…' : 'Update'}
          </button>
        </div>
      </form>

      <JustificationModal
        isOpen={confirming}
        title="Update password policy"
        description="These rules apply to every account immediately. Enter a reason."
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
        loading={loading}
        requirePassword
      />
    </>
  )
}
