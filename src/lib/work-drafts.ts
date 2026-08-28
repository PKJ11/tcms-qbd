// lib/work-drafts.ts
// Shared constants + helpers for the "stash unsaved work across logout" feature.
// Keep this module framework-agnostic (no React, no feature-specific types) so
// it can be imported from both server route handlers and client hooks.

/** How long a draft lives before it is eligible for purge. */
export const WORK_DRAFT_TTL_DAYS = 7
export const WORK_DRAFT_TTL_MS = WORK_DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000

/** Hard cap on a serialized payload. Anything larger is rejected by the API. */
export const WORK_DRAFT_MAX_BYTES = 256 * 1024

/** Debounce between the last edit and an autosave POST. */
export const WORK_DRAFT_AUTOSAVE_DEBOUNCE_MS = 4000

/**
 * Fired on `window` when the session is ending (idle warning shown, or logout
 * in progress). Every mounted useWorkDraft flushes its draft synchronously.
 */
export const SESSION_ENDING_EVENT = 'tcms:session-ending'

/** localStorage key holding a non-sensitive hint for the "Welcome back" screen. */
export const LAST_USER_STORAGE_KEY = 'tcms:last-user'
/** The hint is only honoured for this long after logout. */
export const LAST_USER_TTL_MS = 12 * 60 * 60 * 1000

/** Draft-key + payload schema version per consumer. Bump the SCHEMA whenever
 *  the shape of that form's stored payload changes, so stale drafts from an
 *  older deploy are ignored instead of restored into a mismatched form. */
export const BANK_NEW_DRAFT_KEY = 'bank-new'
export const BANK_NEW_DRAFT_SCHEMA = 1
export const bankEditDraftKey = (bankId: string) => `bank-edit:${bankId}`
export const BANK_EDIT_DRAFT_SCHEMA = 1

export const ASSIGNMENT_NEW_DRAFT_KEY = 'assignment-new'
export const ASSIGNMENT_NEW_DRAFT_SCHEMA = 1

export const PERSONNEL_NEW_DRAFT_KEY = 'personnel-new'
export const PERSONNEL_NEW_DRAFT_SCHEMA = 1

export const QUALIFICATION_NEW_DRAFT_KEY = 'qualification-new'
export const QUALIFICATION_NEW_DRAFT_SCHEMA = 1

export const REFRESHER_NEW_DRAFT_KEY = 'refresher-new'
export const REFRESHER_NEW_DRAFT_SCHEMA = 1

export const TOPIC_NEW_DRAFT_KEY = 'topic-new'
export const TOPIC_NEW_DRAFT_SCHEMA = 1

export interface LastUserHint {
  employeeId: string
  name: string
  reason: 'auto' | 'manual'
  at: number
}

export function readLastUserHint(): LastUserHint | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LAST_USER_STORAGE_KEY)
    if (!raw) return null
    const hint = JSON.parse(raw) as LastUserHint
    if (
      !hint ||
      typeof hint.employeeId !== 'string' ||
      typeof hint.at !== 'number' ||
      Date.now() - hint.at > LAST_USER_TTL_MS
    ) {
      window.localStorage.removeItem(LAST_USER_STORAGE_KEY)
      return null
    }
    return hint
  } catch {
    return null
  }
}

export function writeLastUserHint(hint: Omit<LastUserHint, 'at'>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      LAST_USER_STORAGE_KEY,
      JSON.stringify({ ...hint, at: Date.now() } satisfies LastUserHint)
    )
  } catch {
    // storage disabled / full — the welcome-back prefill is a convenience only
  }
}

export function clearLastUserHint(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(LAST_USER_STORAGE_KEY)
  } catch {
    // ignore
  }
}

/**
 * True only for a path we are willing to redirect a freshly-authenticated user
 * to. Blocks protocol-relative (`//host`), backslash tricks, absolute URLs, and
 * the auth/API routes. Used for the login `?callbackUrl=` and for the value the
 * idle hook hands to `signOut`.
 */
export function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path || typeof path !== 'string') return false
  if (!path.startsWith('/')) return false
  if (path.startsWith('//') || path.startsWith('/\\')) return false
  if (path.startsWith('/login')) return false
  if (path.startsWith('/api/') || path === '/api') return false
  return true
}

/** UTF-8 byte length of a value once JSON-serialized. */
export function serializedByteLength(value: unknown): number {
  const json = JSON.stringify(value ?? null)
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(json).length
  return Buffer.byteLength(json, 'utf8')
}
