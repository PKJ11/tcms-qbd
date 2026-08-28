// hooks/useIdleSessionTimeout.ts
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import type { Session } from 'next-auth'
import { SESSION_ENDING_EVENT, isSafeInternalPath, writeLastUserHint } from '@/lib/work-drafts'

// Tell every mounted useWorkDraft to flush its in-progress work to the server.
// Fired while the JWT is still valid (idle warning) and again, best-effort, as
// logout begins.
function emitSessionEnding() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_ENDING_EVENT))
  }
}

// No activity for this long -> show the "session expiring" warning.
const IDLE_BEFORE_WARNING_MS = 30_000
// Countdown shown in the warning dialog, in seconds.
const WARNING_DURATION_SECONDS = 180
// While the user is active (warning not showing) and the tab is in the
// foreground, touch the server session this often so the short-lived JWT keeps
// sliding forward.
const HEARTBEAT_INTERVAL_MS = 60_000
// How often the watchdog re-evaluates idle / countdown state. Every decision it
// makes is derived from Date.now() rather than from a count of ticks, so a
// background tab that throttles this interval simply catches up on its next
// tick instead of freezing the countdown.
const TICK_INTERVAL_MS = 1_000

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
  // Wall-clock timestamp (ms) of the last observed user activity.
  const lastActivityRef = useRef(Date.now())
  // Wall-clock timestamp (ms) at which auto-logout fires. Only meaningful while
  // the warning is showing.
  const deadlineRef     = useRef<number | null>(null)
  const tickRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const heartbeatRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const loggingOutRef   = useRef(false)

  // Latest identity, kept in a ref so doLogout can stay dependency-free.
  const userHintRef = useRef<{ employeeId: string; name: string } | null>(null)
  userHintRef.current = session?.user
    ? { employeeId: session.user.employeeId, name: session.user.name }
    : null

  const doLogout = useCallback(async (type: 'auto' | 'manual') => {
    if (loggingOutRef.current) return
    loggingOutRef.current = true

    if (tickRef.current)      clearInterval(tickRef.current)
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)

    // Best-effort final flush of any unsaved work (the guaranteed flush already
    // happened when the warning appeared, while the JWT was still valid).
    emitSessionEnding()

    // Leave a non-sensitive hint so the login screen can greet the user by name
    // and ask only for their password. Never the password itself.
    if (userHintRef.current) {
      writeLastUserHint({ ...userHintRef.current, reason: type })
    }

    // Send the user back to where they were once they re-authenticate.
    const here =
      typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : null
    const callbackUrl = isSafeInternalPath(here) ? here : '/dashboard'

    try {
      await fetch('/api/auth/logout-audit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type }),
      })
    } catch {
      // never block logout on audit failure
    } finally {
      await signOut({ callbackUrl })
    }
  }, [])

  const enterWarning = useCallback(() => {
    showWarningRef.current = true
    deadlineRef.current = Date.now() + WARNING_DURATION_SECONDS * 1000
    setShowWarning(true)
    setSecondsRemaining(WARNING_DURATION_SECONDS)
    // Guaranteed server flush of unsaved work: the JWT is still valid here
    // (warning shows at 30s idle, token lives 4 min).
    emitSessionEnding()
  }, [])

  const exitWarning = useCallback(() => {
    showWarningRef.current = false
    deadlineRef.current = null
    lastActivityRef.current = Date.now()
    setShowWarning(false)
    setSecondsRemaining(WARNING_DURATION_SECONDS)
  }, [])

  // Confirm with the server that the JWT is still alive. Returns true only on a
  // definitive "still valid" answer. An expired token comes back from update()
  // without a user, which we treat as a dead session; a network failure returns
  // false without forcing a logout, leaving the JWT maxAge as the backstop.
  const verifySession = useCallback(async (): Promise<boolean> => {
    if (loggingOutRef.current) return false
    let refreshed: Session | null = null
    try {
      refreshed = await update()
    } catch {
      return false
    }
    // Reached the server but got an empty session back -> token has expired.
    if (refreshed && !refreshed.user?.id) {
      void doLogout('auto')
      return false
    }
    return Boolean(refreshed?.user?.id)
  }, [update, doLogout])

  // Single wall-clock-driven watchdog. Safe to call from the interval, from
  // visibilitychange, or directly.
  const evaluate = useCallback(() => {
    if (loggingOutRef.current) return
    const now = Date.now()

    if (!showWarningRef.current) {
      if (now - lastActivityRef.current >= IDLE_BEFORE_WARNING_MS) {
        enterWarning()
      }
      return
    }

    const remaining = Math.ceil(((deadlineRef.current ?? now) - now) / 1000)
    if (remaining <= 0) {
      setSecondsRemaining(0)
      void doLogout('auto')
    } else {
      setSecondsRemaining(remaining)
    }
  }, [enterWarning, doLogout])

  // Any user activity. Before the warning shows, it just pushes the idle clock
  // back out. Once the warning is showing, activity alone (a hover, a stray
  // keypress) does NOT dismiss it — it only restarts the 180s countdown, per
  // the required flow. Only the buttons below close it.
  const handleActivity = useCallback(() => {
    if (loggingOutRef.current) return
    lastActivityRef.current = Date.now()
    if (showWarningRef.current) {
      deadlineRef.current = Date.now() + WARNING_DURATION_SECONDS * 1000
      setSecondsRemaining(WARNING_DURATION_SECONDS)
    }
  }, [])

  const handleStayConnected = useCallback(async () => {
    if (loggingOutRef.current) return
    // An expired JWT cannot be refreshed — update() comes back without a user.
    // In that case the session is already gone server-side, so sign out instead
    // of silently pretending we're still connected (which used to leave the UI
    // "connected" until the next navigation bounced to /login).
    const alive = await verifySession()
    if (!alive) {
      void doLogout('auto')
      return
    }
    exitWarning()
  }, [verifySession, exitWarning, doLogout])

  const handleLogoutNow = useCallback(() => {
    void doLogout('manual')
  }, [doLogout])

  useEffect(() => {
    if (status !== 'authenticated' || !session) return

    lastActivityRef.current = Date.now()

    const listenerOpts: AddEventListenerOptions = { passive: true, capture: true }
    ACTIVITY_EVENTS.forEach((evt) =>
      document.addEventListener(evt, handleActivity, listenerOpts)
    )

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (loggingOutRef.current) return
      // The tab may have been frozen for minutes while hidden: the countdown
      // interval was throttled and the heartbeat never renewed the JWT.
      // Re-derive the countdown from wall-clock time, then re-check the token.
      evaluate()
      void verifySession()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    tickRef.current = setInterval(evaluate, TICK_INTERVAL_MS)

    heartbeatRef.current = setInterval(() => {
      if (loggingOutRef.current) return
      if (showWarningRef.current) return
      if (document.visibilityState !== 'visible') return
      update().catch(() => {})
    }, HEARTBEAT_INTERVAL_MS)

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        document.removeEventListener(evt, handleActivity, listenerOpts)
      )
      document.removeEventListener('visibilitychange', handleVisibility)
      if (tickRef.current)      clearInterval(tickRef.current)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [status, session, handleActivity, evaluate, verifySession, update])

  return {
    showWarning,
    secondsRemaining,
    onStayConnected: handleStayConnected,
    onLogoutNow:     handleLogoutNow,
  }
}
