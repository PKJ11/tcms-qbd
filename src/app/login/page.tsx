'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    employeeId: '',
    password:   '',
  })
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!form.employeeId.trim() || !form.password) {
      setError('Employee ID and password are required')
      setLoading(false)
      return
    }

    const result = await signIn('credentials', {
      employeeId: form.employeeId.trim().toUpperCase(),
      password:   form.password,
      redirect:   false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Invalid Employee ID or password. Please check your credentials.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left Panel ─────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a3a2a 0%, #2d6a4f 60%, #40916c 100%)' }}
      >
        {/* Background circles */}
        <div
          className="absolute top-[-80px] right-[-80px] w-[340px] h-[340px] rounded-full opacity-10"
          style={{ background: '#74c69d' }}
        />
        <div
          className="absolute bottom-[-60px] left-[-60px] w-[260px] h-[260px] rounded-full opacity-10"
          style={{ background: '#74c69d' }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg"
            style={{ background: '#fff', color: '#2d6a4f' }}
          >
            QbD
          </div>
          <div>
            <div className="text-white font-semibold text-sm leading-tight">
              QbD Research
            </div>
            <div className="text-xs" style={{ color: '#95d5b2' }}>
              QUALITY BY DESIGN
            </div>
          </div>
        </div>

        {/* Centre content */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Training &amp; Competency<br />Management System
          </h1>
          <p className="text-base mb-8" style={{ color: '#b7e4c7' }}>
            Department-wise induction, on-job scientist qualification
            and refresher training — planned, assessed and evidenced
            in one validated platform.
          </p>

          {/* Feature bullets */}
          <div className="flex flex-col gap-3">
            {[
              'GxP-validated & 21 CFR Part 11 aligned',
              'Full who / when / why / what audit trail',
              'Unit 1 – Unit 3  (Unit 4 ready)',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: '#40916c' }}
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4l2.5 2.5L9 1"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-sm" style={{ color: '#d8f3dc' }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs" style={{ color: '#74c69d' }}>
          TCMS v0.1 &nbsp;•&nbsp; © 2026 QbD Research &amp; Development Lab Pvt. Ltd.
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────── */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12"
        style={{ background: '#f4f6f8' }}
      >
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="mb-8">
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-2"
              style={{ color: '#2d6a4f' }}
            >
              Training &amp; Competency Management
            </p>
            <h2 className="text-3xl font-bold text-gray-900 mb-1">
              Sign in to TCMS
            </h2>
            <p className="text-sm text-gray-500">
              Use your Employee ID and password to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Employee ID */}
            <div>
              <label
                htmlFor="employeeId"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Employee ID
              </label>
              <input
                id="employeeId"
                type="text"
                autoComplete="username"
                autoFocus
                required
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                placeholder="e.g. EMP-001"
                className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition-all"
                style={{
                  borderColor: '#d1d5db',
                  background:  '#fff',
                  color:       '#111827',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2d6a4f'
                  e.target.style.boxShadow   = '0 0 0 3px rgba(45,106,79,0.12)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow   = 'none'
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••••"
                  className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition-all pr-12"
                  style={{
                    borderColor: '#d1d5db',
                    background:  '#fff',
                    color:       '#111827',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2d6a4f'
                    e.target.style.boxShadow   = '0 0 0 3px rgba(45,106,79,0.12)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db'
                    e.target.style.boxShadow   = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-green-700"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <a
                href="/forgot-password"
                className="text-sm font-medium hover:underline"
                style={{ color: '#2d6a4f' }}
              >
                Forgot password?
              </a>
            </div>

            {/* Error message */}
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{
                background: loading ? '#4a9e6f' : '#2d6a4f',
                cursor:     loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!loading)
                  (e.target as HTMLButtonElement).style.background = '#245a41'
              }}
              onMouseLeave={(e) => {
                if (!loading)
                  (e.target as HTMLButtonElement).style.background = '#2d6a4f'
              }}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin"
                    width="16" height="16"
                    viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                  >
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/>
                    <path d="M21 12a9 9 0 00-9-9"/>
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </>
              )}
            </button>

            {/* Audit notice */}
            <div
              className="flex items-start gap-2 px-4 py-3 rounded-lg text-xs"
              style={{
                background: '#f0fdf4',
                color:      '#166534',
                border:     '1px solid #bbf7d0',
              }}
            >
              <svg
                className="flex-shrink-0 mt-0.5"
                width="13" height="13"
                viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>
                Every login is recorded in a tamper-evident audit trail per 21 CFR Part 11.
              </span>
            </div>

            {/* Contact line */}
            <p className="text-center text-xs text-gray-400">
              Need access?{' '}
              <span
                className="font-medium cursor-pointer hover:underline"
                style={{ color: '#2d6a4f' }}
              >
                Contact your QA Training Coordinator
              </span>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}