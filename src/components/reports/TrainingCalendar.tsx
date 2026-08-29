'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { TrainingCalendarData } from '@/modules/reports'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Department { id: string; name: string }
interface AddableTopic { id: string; name: string; sopReference: string | null; alreadyAdded: boolean }

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2]

export function TrainingCalendar({ canEdit }: { canEdit: boolean }) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [departmentId, setDepartmentId] = useState('')
  const [year, setYear] = useState(CURRENT_YEAR)
  const [data, setData] = useState<TrainingCalendarData | null>(null)
  const [loading, setLoading] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Every tick / add / remove writes to the server straight away — this just
  // reflects that back to the user, since there is no explicit Save button.
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Topic picker
  const [pickerOpen, setPickerOpen] = useState(false)
  const [addable, setAddable] = useState<AddableTopic[]>([])
  const [addableLoading, setAddableLoading] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)

  // Bootstrap — department list
  useEffect(() => {
    fetch('/api/reports/training-calendar')
      .then((res) => res.json())
      .then((d) => setDepartments(d.departments ?? []))
      .catch(() => setDepartments([]))
  }, [])

  const fetchCalendar = useCallback(async () => {
    if (!departmentId) { setData(null); return }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ departmentId, year: String(year) })
      const res  = await fetch(`/api/reports/training-calendar?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Failed to load calendar')
      setData(json.data ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load calendar')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [departmentId, year])

  useEffect(() => { fetchCalendar() }, [fetchCalendar])

  // Reset the picker + save indicator whenever the department changes
  useEffect(() => {
    setPickerOpen(false)
    setSelected(new Set())
    setPickerSearch('')
    setSaveState('idle')
  }, [departmentId])

  // A different year is a different sheet — clear the "saved" flag
  useEffect(() => { setSaveState('idle') }, [year])

  const fetchAddable = useCallback(async () => {
    if (!departmentId) return
    setAddableLoading(true)
    try {
      const params = new URLSearchParams({ departmentId, addable: '1' })
      const res  = await fetch(`/api/reports/training-calendar?${params}`)
      const json = await res.json()
      setAddable(json.topics ?? [])
    } finally {
      setAddableLoading(false)
    }
  }, [departmentId])

  async function post(payload: Record<string, unknown>) {
    setSaveState('saving')
    try {
      const res = await fetch('/api/reports/training-calendar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? 'Request failed')
      }
      const json = await res.json()
      setSaveState('saved')
      return json
    } catch (e) {
      setSaveState('idle')
      throw e
    }
  }

  function openPicker() {
    setPickerOpen(true)
    setSelected(new Set())
    setPickerSearch('')
    fetchAddable()
  }

  const filteredAddable = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase()
    if (!q) return addable
    return addable.filter(
      (t) => t.name.toLowerCase().includes(q) || t.sopReference?.toLowerCase().includes(q)
    )
  }, [addable, pickerSearch])

  const selectableCount = filteredAddable.filter((t) => !t.alreadyAdded).length

  async function addSelectedTopics() {
    if (selected.size === 0) return
    setAdding(true)
    try {
      await post({ action: 'addTopics', departmentId, topicIds: Array.from(selected) })
      setSelected(new Set())
      await Promise.all([fetchCalendar(), fetchAddable()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add topics')
    } finally {
      setAdding(false)
    }
  }

  async function toggleCell(rowId: string, monthIndex: number, current: boolean) {
    if (!canEdit || !data) return
    setData({
      ...data,
      rows: data.rows.map((r) =>
        r.id === rowId
          ? { ...r, months: r.months.map((m, i) => (i === monthIndex ? !current : m)) }
          : r
      ),
    })
    try {
      await post({ action: 'setMark', rowId, year, month: monthIndex + 1, checked: !current })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
      fetchCalendar()
    }
  }

  async function addRow() {
    const title = newTitle.trim()
    if (!title || !departmentId) return
    try {
      await post({ action: 'addRow', departmentId, title })
      setNewTitle('')
      fetchCalendar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add training')
    }
  }

  async function saveRename(rowId: string) {
    const title = editingText.trim()
    setEditingId(null)
    if (!title) return
    try {
      await post({ action: 'renameRow', rowId, title })
      fetchCalendar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not rename training')
    }
  }

  async function deleteRow(rowId: string) {
    if (!confirm('Remove this training from the calendar? Its ticks for every year will be deleted.')) return
    try {
      await post({ action: 'deleteRow', rowId })
      fetchCalendar()
      if (pickerOpen) fetchAddable()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete training')
    }
  }

  function handleExport(format: 'csv' | 'pdf') {
    if (!departmentId) return
    const params = new URLSearchParams({ departmentId, year: String(year), format })
    window.open(`/api/reports/training-calendar?${params}`, '_blank')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Training Calendar</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Department-wise yearly training plan. {canEdit
              ? 'Add trainings from the Topics list, then tick a month when each is planned to be given. Every change saves automatically — there is no Save button.'
              : 'View only — a Trainer maintains the ticks.'} Format QbD/QA/F/007-03
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={!departmentId}
            className="px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 disabled:opacity-40"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={!departmentId}
            className="px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 disabled:opacity-40"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Department + year picker */}
      <div className="bg-white rounded-xl border p-4 mb-4 flex items-center gap-3 flex-wrap" style={{ borderColor: '#e5e7eb' }}>
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb', minWidth: 240 }}
        >
          <option value="">Select department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {canEdit && departmentId && (
          <button
            type="button"
            onClick={() => (pickerOpen ? setPickerOpen(false) : openPicker())}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white ml-auto"
            style={{ background: '#2d6a4f' }}
          >
            {pickerOpen ? 'Close topic picker' : '+ Add topics'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 px-4 py-2 rounded-lg text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* Topic picker panel */}
      {canEdit && pickerOpen && departmentId && (
        <div className="bg-white rounded-xl border mb-4" style={{ borderColor: '#e5e7eb' }}>
          <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid #f3f4f6' }}>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-700">Add trainings from the Topics list</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Every Active and Pending topic. Tick as many as you like, then add them all in one go.
              </p>
            </div>
            <button
              type="button"
              onClick={addSelectedTopics}
              disabled={selected.size === 0 || adding}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
              style={{ background: '#2d6a4f' }}
            >
              {adding ? 'Adding…' : selected.size ? `Add ${selected.size} selected` : 'Add selected'}
            </button>
          </div>

          <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid #f3f4f6' }}>
            <input
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Search topics…"
              className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: '#e5e7eb' }}
            />
            <button
              type="button"
              onClick={() =>
                setSelected(new Set(filteredAddable.filter((t) => !t.alreadyAdded).map((t) => t.id)))
              }
              disabled={selectableCount === 0}
              className="text-xs font-medium disabled:opacity-40"
              style={{ color: '#2d6a4f' }}
            >
              Select all ({selectableCount})
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={selected.size === 0}
              className="text-xs font-medium text-gray-500 disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {addableLoading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Loading topics…</div>
            ) : filteredAddable.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                {addable.length === 0 ? 'No active topics found.' : 'No topics match your search.'}
              </div>
            ) : (
              filteredAddable.map((t) => {
                const checked = t.alreadyAdded || selected.has(t.id)
                return (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm ${t.alreadyAdded ? 'opacity-50' : 'hover:bg-gray-50 cursor-pointer'}`}
                    style={{ borderBottom: '1px solid #f7f7f8' }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={t.alreadyAdded}
                      onChange={(e) => {
                        setSelected((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(t.id)
                          else next.delete(t.id)
                          return next
                        })
                      }}
                    />
                    <span className="flex-1 text-gray-900">
                      {t.name}
                      {t.sopReference && <span className="text-gray-400"> — {t.sopReference}</span>}
                    </span>
                    {t.alreadyAdded && (
                      <span className="text-xs font-medium" style={{ color: '#166534' }}>Already added</span>
                    )}
                  </label>
                )
              })
            )}
          </div>
        </div>
      )}

      {!departmentId ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-xl border" style={{ borderColor: '#e5e7eb' }}>
          <p className="text-sm text-gray-400">Choose a department to see its training calendar.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading calendar...
        </div>
      ) : data ? (
        <div className="bg-white rounded-xl border overflow-x-auto" style={{ borderColor: '#e5e7eb' }}>
          <div className="px-5 py-3 text-sm flex items-center gap-2" style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <span className="text-gray-400">Department: </span>
            <span className="font-semibold text-gray-900">{data.departmentName}</span>
            <span className="text-gray-300 mx-2">|</span>
            <span className="text-gray-400">Year: </span>
            <span className="font-semibold text-gray-900">{data.year}</span>

            {canEdit && (
              <span className="ml-auto flex items-center gap-1.5 text-xs font-medium">
                {saveState === 'saving' ? (
                  <span className="text-gray-400">Saving…</span>
                ) : saveState === 'saved' ? (
                  <span className="flex items-center gap-1" style={{ color: '#166534' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    All changes saved
                  </span>
                ) : (
                  <span className="text-gray-300">Changes save automatically</span>
                )}
              </span>
            )}
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{ width: 48 }}>Sr.</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{ minWidth: 220 }}>Topic of Training</th>
                {MONTHS.map((m) => (
                  <th key={m} className="px-2 py-2 text-xs font-semibold text-gray-500" style={{ width: 44 }}>{m}</th>
                ))}
                {canEdit && <th style={{ width: 44 }} />}
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 15 : 14} className="px-3 py-10 text-center text-sm text-gray-400">
                    No trainings yet.{canEdit ? ' Use “+ Add topics” above to add them.' : ''}
                  </td>
                </tr>
              ) : (
                data.rows.map((row, idx) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td className="px-3 py-2 text-xs text-gray-400 text-center">{idx + 1}</td>
                    <td className="px-3 py-2 text-xs font-medium text-gray-900">
                      {canEdit && !row.isTopic && editingId === row.id ? (
                        <input
                          autoFocus
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onBlur={() => saveRename(row.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename(row.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="w-full px-2 py-1 rounded border text-xs outline-none"
                          style={{ borderColor: '#d1d5db' }}
                        />
                      ) : (
                        <span
                          className={canEdit && !row.isTopic ? 'cursor-text hover:underline' : ''}
                          onClick={() => {
                            if (!canEdit || row.isTopic) return
                            setEditingId(row.id)
                            setEditingText(row.title)
                          }}
                        >
                          {row.title}
                        </span>
                      )}
                      {!row.isTopic && (
                        <span
                          className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold align-middle"
                          style={{ background: '#eff6ff', color: '#1d4ed8' }}
                        >
                          Manual
                        </span>
                      )}
                    </td>
                    {row.months.map((on, mi) => (
                      <td key={mi} className="px-2 py-2 text-center">
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => toggleCell(row.id, mi, on)}
                          aria-label={`${MONTHS[mi]} ${on ? 'ticked' : 'not ticked'}`}
                          className="w-6 h-6 rounded border flex items-center justify-center mx-auto disabled:cursor-default"
                          style={{
                            borderColor: on ? '#2d6a4f' : '#d1d5db',
                            background:  on ? '#2d6a4f' : '#fff',
                            color:       '#fff',
                          }}
                        >
                          {on && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      </td>
                    ))}
                    {canEdit && (
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => deleteRow(row.id)}
                          aria-label="Remove training"
                          className="text-gray-300 hover:text-red-500"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {canEdit && (
            <div className="flex items-center gap-2 px-3 py-3" style={{ borderTop: '1px solid #f3f4f6' }}>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addRow() }}
                placeholder="Add an extra training not in the Topics list…"
                className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#e5e7eb' }}
              />
              <button
                type="button"
                onClick={addRow}
                disabled={!newTitle.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{ background: '#2d6a4f' }}
              >
                Add
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
