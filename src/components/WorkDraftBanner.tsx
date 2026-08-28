'use client'

interface Props {
  /** e.g. "4 unsaved questions" */
  summary: string
  /** ISO timestamp the draft was last saved. */
  updatedAt: string
  onRestore: () => void
  onDiscard: () => void
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const mins = Math.round((Date.now() - then) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

// Non-destructive prompt shown when a server-side draft is found for the page
// the user just returned to. Restoring merely re-populates the form — the user
// still goes through the normal Save + justification step.
export function WorkDraftBanner({ summary, updatedAt, onRestore, onDiscard }: Props) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl mb-4"
      style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
    >
      <div className="flex items-start gap-2 text-sm" style={{ color: '#1e40af' }}>
        <svg
          className="flex-shrink-0 mt-0.5"
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        <span>
          Unsaved work from your last session — <strong>{summary}</strong>, saved {relativeTime(updatedAt)}.
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onDiscard}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569' }}
        >
          Discard
        </button>
        <button
          onClick={onRestore}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
          style={{ background: '#1d4ed8' }}
        >
          Restore my work
        </button>
      </div>
    </div>
  )
}
