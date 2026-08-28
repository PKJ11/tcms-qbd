// hooks/useWorkDraft.ts
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  SESSION_ENDING_EVENT,
  WORK_DRAFT_AUTOSAVE_DEBOUNCE_MS,
} from '@/lib/work-drafts'

interface PendingDraft<T> {
  payload: T
  updatedAt: string
}

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

interface WorkDraftApi<T> {
  /** A server draft found on mount and not yet restored or discarded. */
  pendingDraft: PendingDraft<T> | null
  /** Apply `pendingDraft` and resume autosave. */
  restore: () => void
  /** Delete the server draft and resume autosave from the current state. */
  discard: () => void
  /** Delete the server draft after a successful real save. */
  clear: () => void
}

// While `pendingDraft` is unresolved we must NOT autosave — the live form is
// still empty and a snapshot would clobber the good copy on the server.
export function useWorkDraft<T>(draftKey: string, opts: Options<T>): WorkDraftApi<T> {
  const { routePath, schemaVersion, snapshot, onRestore, watch, isEmpty, enabled = true } = opts

  const [pendingDraft, setPendingDraft] = useState<PendingDraft<T> | null>(null)
  const pendingDraftRef = useRef<PendingDraft<T> | null>(null)
  pendingDraftRef.current = pendingDraft
  const lockedRef = useRef(false) // mirrors "pendingDraft unresolved" for listeners

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

  // ── Load any existing draft once per key ──────────────────────────────
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    lockedRef.current = false
    setPendingDraft(null)

    fetch(url)
      .then(async (res) => {
        if (cancelled || !res.ok) return
        const data = await res.json()
        const d = data?.draft
        if (!d || d.schemaVersion !== schemaVersion) return // stale shape → ignore
        if (isEmptyRef.current?.(d.payload as T)) return
        lockedRef.current = true
        setPendingDraft({ payload: d.payload as T, updatedAt: d.updatedAt })
      })
      .catch(() => {})

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

  const restore = useCallback(() => {
    const cur = pendingDraftRef.current
    if (!cur) return
    onRestoreRef.current(cur.payload)
    lockedRef.current = false
    setPendingDraft(null)
  }, [])

  const discard = useCallback(() => {
    lockedRef.current = false
    setPendingDraft(null)
    void fetch(url, { method: 'DELETE' }).catch(() => {})
  }, [url])

  const clear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    lockedRef.current = false
    setPendingDraft(null)
    void fetch(url, { method: 'DELETE' }).catch(() => {})
  }, [url])

  return { pendingDraft, restore, discard, clear }
}
