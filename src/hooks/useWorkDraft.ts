// hooks/useWorkDraft.ts
'use client'
import { useCallback, useEffect, useRef } from 'react'
import {
  SESSION_ENDING_EVENT,
  WORK_DRAFT_AUTOSAVE_DEBOUNCE_MS,
} from '@/lib/work-drafts'

interface Options<T> {
  /** Where to send the user back after re-login. Must be an internal path. */
  routePath: string
  /** Bump whenever the shape of `T` changes so stale drafts aren't offered. */
  schemaVersion: number
  /** Current serializable form / staging state. Called in effects + handlers. */
  snapshot: () => T
  /** Apply a restored payload back onto component state. */
  onRestore: (payload: T) => void
  /** Values that, when changed, mean the snapshot is worth re-saving. */
  watch: readonly unknown[]
  /** Skip persisting a snapshot that holds nothing worth keeping. */
  isEmpty?: (snapshot: T) => boolean
  /** Master off-switch (e.g. a non-editor viewing a read-only page). */
  enabled?: boolean
}

interface WorkDraftApi {
  /** Delete the server draft after a successful real save. */
  clear: () => void
}

// A server draft found on mount is now restored straight into the form — no
// prompt. The user still goes through the normal Save + justification step, so
// silently re-populating the fields they had open is safe.
export function useWorkDraft<T>(draftKey: string, opts: Options<T>): WorkDraftApi {
  const { routePath, schemaVersion, snapshot, onRestore, watch, isEmpty, enabled = true } = opts

  // While the server draft is still loading we must NOT autosave — the live
  // form is still empty and a snapshot would clobber the good copy on the server.
  const lockedRef = useRef(false)

  // Keep the latest closures without re-subscribing listeners every render.
  const snapshotRef = useRef(snapshot)
  const onRestoreRef = useRef(onRestore)
  const isEmptyRef = useRef(isEmpty)
  snapshotRef.current = snapshot
  onRestoreRef.current = onRestore
  isEmptyRef.current = isEmpty

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const keyRef = useRef(draftKey)
  keyRef.current = draftKey
  const url = `/api/work-drafts/${encodeURIComponent(draftKey)}`

  const save = useCallback(
    (useKeepalive: boolean) => {
      if (lockedRef.current) return
      const payload = snapshotRef.current()
      if (isEmptyRef.current?.(payload)) return
      try {
        void fetch('/api/work-drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draftKey: keyRef.current, routePath, schemaVersion, payload }),
          keepalive: useKeepalive,
        }).catch(() => {})
      } catch {
        // never let autosave throw into the render tree
      }
    },
    [routePath, schemaVersion]
  )

  // ── Load any existing draft once per key and restore it immediately ───
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    lockedRef.current = true

    fetch(url)
      .then(async (res) => {
        if (cancelled || !res.ok) return
        const data = await res.json()
        const d = data?.draft
        if (!d || d.schemaVersion !== schemaVersion) return // stale shape → ignore
        if (isEmptyRef.current?.(d.payload as T)) return
        onRestoreRef.current(d.payload as T)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) lockedRef.current = false
      })

    return () => {
      cancelled = true
    }
  }, [url, schemaVersion, enabled])

  // ── Debounced autosave on watched changes ────────────────────────────
  const firstRunRef = useRef(true)
  useEffect(() => {
    if (!enabled) return
    if (firstRunRef.current) {
      firstRunRef.current = false
      return
    }
    if (lockedRef.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(false), WORK_DRAFT_AUTOSAVE_DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...watch, enabled, save])

  // ── Flush immediately when the session is ending ─────────────────────
  useEffect(() => {
    if (!enabled) return
    const onEnding = () => save(true)
    window.addEventListener(SESSION_ENDING_EVENT, onEnding)
    return () => window.removeEventListener(SESSION_ENDING_EVENT, onEnding)
  }, [enabled, save])

  const clear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    lockedRef.current = false
    void fetch(url, { method: 'DELETE' }).catch(() => {})
  }, [url])

  return { clear }
}
