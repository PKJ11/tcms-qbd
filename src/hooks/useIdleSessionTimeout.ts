// hooks/useIdleSessionTimeout.ts
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'

// No activity for this long -> show the "session expiring" warning.
const IDLE_BEFORE_WARNING_MS = 30_000
// Countdown shown in the warning dialog, in seconds.
const WARNING_DURATION_SECONDS = 180
// While the user is active (warning not showing), touch the server session
// this often so the short-lived JWT keeps sliding forward.
const HEARTBEAT_INTERVAL_MS = 60_000

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'wheel',
  'touchstart',
  'scroll',
  'click',
] as const

export function useIdleSessionTimeout() {
  const { data: session, status, update } = useSession()

  const [showWarning, setShowWarning] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_DURATION_SECONDS)

  // Mirrors showWarning for use inside listeners/intervals without stale closures.
  const showWarningRef  = useRef(false)
  const idleTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const heartbeatRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const loggingOutRef   = useRef(false)

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [])

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const doLogout = useCallback(async (type: 'auto' | 'manual') => {
    if (loggingOutRef.current) return
    loggingOutRef.current = true

    clearIdleTimer()
    clearCountdown()
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)

    try {
      await fetch('/api/auth/logout-audit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type }),
      })
    } catch {
      // never block logout on audit failure
    } finally {
      await signOut({ callbackUrl: '/login' })
    }
  }, [clearIdleTimer, clearCountdown])

  const startCountdown = useCallback(() => {
    clearCountdown()
    countdownRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          doLogout('auto')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [clearCountdown, doLogout])

  const showTheWarning = useCallback(() => {
    showWarningRef.current = true
    setShowWarning(true)
    setSecondsRemaining(WARNING_DURATION_SECONDS)
    startCountdown()
  }, [startCountdown])

  const scheduleIdleTimer = useCallback(() => {
    clearIdleTimer()
    idleTimerRef.current = setTimeout(showTheWarning, IDLE_BEFORE_WARNING_MS)
  }, [clearIdleTimer, showTheWarning])

  // Any user activity. Before the warning shows, it just pushes the idle
  // clock back out. Once the warning is showing, activity alone (a hover,
  // a stray keypress) does NOT dismiss it — it only restarts the 180s
  // countdown, per the required flow. Only the buttons below close it.
  const handleActivity = useCallback(() => {
    if (loggingOutRef.current) return
    if (showWarningRef.current) {
      setSecondsRemaining(WARNING_DURATION_SECONDS)
    } else {
      scheduleIdleTimer()
    }
  }, [scheduleIdleTimer])

  const handleStayConnected = useCallback(async () => {
    clearCountdown()
    showWarningRef.current = false
    setShowWarning(false)
    setSecondsRemaining(WARNING_DURATION_SECONDS)
    try {
      await update()
    } catch {
      // if the refresh fails, the idle cycle still restarts below;
      // the short token maxAge will catch it as a backstop if needed
    }
    scheduleIdleTimer()
  }, [clearCountdown, scheduleIdleTimer, update])

  const handleLogoutNow = useCallback(() => {
    void doLogout('manual')
  }, [doLogout])

  useEffect(() => {
    if (status !== 'authenticated' || !session) return

    scheduleIdleTimer()

    const listenerOpts: AddEventListenerOptions = { passive: true, capture: true }
    ACTIVITY_EVENTS.forEach((evt) =>
      document.addEventListener(evt, handleActivity, listenerOpts)
    )

    heartbeatRef.current = setInterval(() => {
      if (!showWarningRef.current) update().catch(() => {})
    }, HEARTBEAT_INTERVAL_MS)

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        document.removeEventListener(evt, handleActivity, listenerOpts)
      )
      clearIdleTimer()
      clearCountdown()
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [status, session, handleActivity, scheduleIdleTimer, clearIdleTimer, clearCountdown, update])

  return {
    showWarning,
    secondsRemaining,
    onStayConnected: handleStayConnected,
    onLogoutNow:     handleLogoutNow,
  }
}
