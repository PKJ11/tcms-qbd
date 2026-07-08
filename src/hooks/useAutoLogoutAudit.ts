// hooks/useAutoLogoutAudit.ts
'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useRef } from 'react'

export function useAutoLogoutAudit() {
  const { data: session } = useSession()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!session?.expires) return

    const msUntilExpiry = new Date(session.expires).getTime() - Date.now() - 5000
    if (msUntilExpiry <= 0) return

    timerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/auth/logout-audit', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ type: 'auto' }),
        })
      } finally {
        signOut({ callbackUrl: '/login' })
      }
    }, msUntilExpiry)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [session?.expires])
}