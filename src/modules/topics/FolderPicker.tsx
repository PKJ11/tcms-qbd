'use client'

import { useState } from 'react'

export interface FolderOption { id: string; name: string }

interface Props {
  folders:          FolderOption[]
  selectedIds:      string[]
  onSelectedChange: (ids: string[]) => void
  newNames:         string[]
  onNewNamesChange: (names: string[]) => void
}

const MAX_LEN = 60
const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

// Pick one or more existing folders, or type a new folder name. New folders
// are only created on the server when the topic itself is saved.
export function FolderPicker({ folders, selectedIds, onSelectedChange, newNames, onNewNamesChange }: Props) {
  const [draft, setDraft] = useState('')
  const [hint,  setHint]  = useState<string | null>(null)

  function toggle(id: string) {
    onSelectedChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
  }

  function addNew() {
    const name = clean(draft)
    setHint(null)
    if (!name) return
    if (name.length > MAX_LEN) { setHint(`Folder names can be up to ${MAX_LEN} characters.`); return }
    const existing = folders.find((f) => f.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      if (!selectedIds.includes(existing.id)) onSelectedChange([...selectedIds, existing.id])
      setHint(`"${existing.name}" already exists, so it has been selected.`)
      setDraft('')
      return
    }
    if (newNames.some((n) => n.toLowerCase() === name.toLowerCase())) { setDraft(''); return }
    onNewNamesChange([...newNames, name])
    setDraft('')
  }

  const total = selectedIds.length + newNames.length

  return (
    <div className="flex flex-col gap-3">
      {folders.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Existing folders">
          {folders.map((f) => {
            const on = selectedIds.includes(f.id)
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => toggle(f.id)}
                aria-pressed={on}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors"
                style={{
                  borderColor: on ? '#2d6a4f' : '#e5e7eb',
                  background:  on ? '#f0fdf4' : '#fff',
                  color:       on ? '#14532d' : '#374151',
                  fontWeight:  on ? 600 : 400,
                }}
              >
                <FolderIcon open={on} />
                {f.name}
                {on && <span aria-hidden="true">✓</span>}
              </button>
            )
          })}
        </div>
      )}

      {newNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {newNames.map((n) => (
            <span
              key={n}
              className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-lg border text-sm font-semibold"
              style={{ borderColor: '#2d6a4f', background: '#f0fdf4', color: '#14532d' }}
            >
              <FolderIcon open />
              {n}
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide" style={{ background: '#dcfce7', color: '#166534' }}>
                New
              </span>
              <button
                type="button"
                onClick={() => onNewNamesChange(newNames.filter((x) => x !== n))}
                aria-label={`Remove new folder ${n}`}
                className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:bg-white"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          maxLength={MAX_LEN}
          onChange={(e) => { setDraft(e.target.value); setHint(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNew() } }}
          placeholder="New folder name, e.g. Microbiology"
          aria-label="New folder name"
          className="flex-1 min-w-0 px-4 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#d1d5db', background: '#fff' }}
        />
        <button
          type="button"
          onClick={addNew}
          disabled={!clean(draft)}
          className="px-3 py-2 rounded-lg border text-sm font-medium disabled:opacity-50"
          style={{ borderColor: '#2d6a4f', color: '#2d6a4f', background: '#fff' }}
        >
          + Create folder
        </button>
      </div>

      <p className="text-xs" style={{ color: hint ? '#92400e' : '#6b7280' }}>
        {hint ?? (total === 0
          ? 'Choose at least one folder. A topic can be in more than one folder.'
          : `This topic will be filed in ${total} folder${total === 1 ? '' : 's'}.`)}
      </p>
    </div>
  )
}

export function FolderIcon({ open = false, size = 14 }: { open?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={open ? 'currentColor' : 'none'} fillOpacity={open ? 0.15 : 0} stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  )
}
