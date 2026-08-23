'use client'

interface Props {
  open:            boolean
  secondsRemaining: number
  onStayConnected: () => void
  onLogoutNow:     () => void
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SessionTimeoutModal({ open, secondsRemaining, onStayConnected, onLogoutNow }: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl"
        style={{ border: '1px solid #e5e7eb' }}
      >
        <div className="flex items-start gap-3 px-6 pt-6 pb-4">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#fef2f2' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div>
            <h3 id="session-timeout-title" className="text-base font-semibold text-gray-900">
              Your session is about to expire
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              You've been inactive for a while. For your security, you'll be signed out automatically.
            </p>
          </div>
        </div>

        <div className="px-6 pb-2">
          <div
            className="flex items-center justify-center rounded-xl py-4"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
          >
            <span className="text-3xl font-bold tabular-nums" style={{ color: '#dc2626' }}>
              {formatTime(secondsRemaining)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Signing out in {secondsRemaining} second{secondsRemaining === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-5">
          <button
            onClick={onLogoutNow}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 transition-all"
            style={{ background: '#f3f4f6' }}
          >
            Log out
          </button>
          <button
            onClick={onStayConnected}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
            style={{ background: '#2d6a4f' }}
          >
            Stay connected
          </button>
        </div>
      </div>
    </div>
  )
}
