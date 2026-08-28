'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatDate } from '@/lib/utils'
import type { AppRole } from '@/lib/types'
import type { ReportScope } from './ReportsHub'
import { ReportFilterBar, EMPTY_REPORT_FILTERS, matchesReportFilters, type ReportFilters, type DateFilterConfig } from './ReportFilterBar'
import { OrgFilterBar, EMPTY_ORG_FILTER, type OrgFilterValue } from '@/components/shared/OrgFilterBar'

const STATUS_OPTIONS = [
  { value: 'COMPLETED',   label: 'Completed' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'NOT_STARTED', label: 'Not started' },
  { value: 'OVERDUE',     label: 'Overdue' },
  { value: 'FAILED',      label: 'Failed' },
]

const DATE_FILTERS: DateFilterConfig[] = [
  { key: 'assigned',  label: 'Assigned' },
  { key: 'due',       label: 'Due' },
  { key: 'completed', label: 'Completed' },
]

interface IndexEntry {
  id:          string
  topicName:   string
  trigger:     string
  status:      string
  assignedAt:  string
  dueDate:     string
  startedAt:   string | null
  completedAt: string | null
  score:       number | null
  outcome:     string | null
  assignedBy:  string
}

interface Person {
  id:          string
  name:        string
  employeeId:  string
  designation?: string
  department?: { id: string; name: string } | null
  unit?:       { id: string; name: string } | null
  section?:    { id: string; name: string } | null
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  COMPLETED:   { bg: '#f0fdf4', color: '#166534' },
  IN_PROGRESS: { bg: '#eff6ff', color: '#1d4ed8' },
  NOT_STARTED: { bg: '#f9fafb', color: '#6b7280' },
  OVERDUE:     { bg: '#fef2f2', color: '#dc2626' },
  FAILED:      { bg: '#fef2f2', color: '#dc2626' },
}

interface Props {
  userId:    string
  userName:  string
  roles:     AppRole[]
  scope:     ReportScope
  scopedIds: string[]  // team IDs — unused when scope==='all'
}

export function TrainingIndexReport({ userId, userName, roles, scope, scopedIds }: Props) {
  const [persons,    setPersons]    = useState<Person[]>([])
  const [selectedId, setSelectedId] = useState(userId)
  const [entries,    setEntries]    = useState<IndexEntry[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filters,    setFilters]    = useState<ReportFilters>(EMPTY_REPORT_FILTERS)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [orgFilter,  setOrgFilter]  = useState<OrgFilterValue>(EMPTY_ORG_FILTER)
  const [search,     setSearch]     = useState('')

  const isOrgWide = scope === 'all'
  const canViewOthers = isOrgWide || scopedIds.length > 0

  // Load the candidate persons list once — used both to resolve the
  // currently-selected person's display name and to search/filter from.
  useEffect(() => {
    if (!canViewOthers) return

    async function fetchPersons() {
      const res  = await fetch(`/api/personnel?isActive=true${isOrgWide ? '&scope=all' : ''}`)
      const data = await res.json()
      const all: Person[] = data.persons ?? []

      const filtered = isOrgWide
        ? all
        : all.filter((p) => scopedIds.includes(p.id))

      setPersons(filtered)
    }
    fetchPersons()
  }, [canViewOthers, isOrgWide, scopedIds])

  // Reset selection back to self whenever the scope changes and the
  // previously-selected person falls outside the new scope
  useEffect(() => {
    if (isOrgWide) return
    if (selectedId !== userId && !scopedIds.includes(selectedId)) {
      setSelectedId(userId)
    }
  }, [scope, scopedIds, isOrgWide, selectedId, userId])

  const fetchIndex = useCallback(async () => {
    if (!selectedId) return
    setLoading(true)
    const res  = await fetch(`/api/reports/training-index/${selectedId}?scope=${scope}`)
    const data = await res.json()
    setEntries(data.entries ?? [])
    setLoading(false)
  }, [selectedId, scope])

  useEffect(() => { fetchIndex() }, [fetchIndex])
  useEffect(() => { setFilters(EMPTY_REPORT_FILTERS) }, [selectedId])

  function handleExport(format: 'csv' | 'pdf') {
    window.open(`/api/reports/training-index/${selectedId}?scope=${scope}&format=${format}`, '_blank')
  }

  function selectPerson(personId: string) {
    setSelectedId(personId)
    setPickerOpen(false)
    setSearch('')
    setOrgFilter(EMPTY_ORG_FILTER)
  }

  const selectedPerson = selectedId === userId
    ? { id: userId, name: userName, employeeId: '' }
    : persons.find((p) => p.id === selectedId)

  const searchResults = useMemo(() => {
    if (!pickerOpen) return []
    const q = search.trim().toLowerCase()
    return persons
      .filter((p) => p.id !== userId || isOrgWide)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.employeeId.toLowerCase().includes(q))
      .filter((p) => !orgFilter.departmentId || p.department?.id === orgFilter.departmentId)
      .filter((p) => !orgFilter.unitId       || p.unit?.id       === orgFilter.unitId)
      .filter((p) => !orgFilter.sectionId    || p.section?.id    === orgFilter.sectionId)
      .slice(0, 8)
  }, [pickerOpen, persons, search, orgFilter, userId, isOrgWide])

  const filteredEntries = useMemo(() => entries.filter((e: IndexEntry) => matchesReportFilters(filters, {
    name: e.topicName,
    status: e.status,
    dateValues: { assigned: e.assignedAt, due: e.dueDate, completed: e.completedAt },
  })), [entries, filters])

  const completed = filteredEntries.filter((e) => e.status === 'COMPLETED').length
  const overdue   = filteredEntries.filter((e) => e.status === 'OVERDUE').length

  return (
    <div>
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Training Index</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Per-person training record. Format QbD/QA/F/007-09 · URS-RPT-002
            {!isOrgWide && (
              <span
                className="ml-2 px-1.5 py-0.5 rounded text-xs font-semibold"
                style={{ background: '#eff6ff', color: '#1d4ed8' }}
              >
                My team
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* Person picker — search by name/employee ID, department, unit, section */}
      <div className="bg-white rounded-xl border p-4 mb-4" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">
            <span className="text-gray-400">Viewing: </span>
            <span className="font-semibold text-gray-900">
              {selectedPerson?.name ?? '—'}
              {selectedPerson?.employeeId ? ` · ${selectedPerson.employeeId}` : ''}
            </span>
            {selectedId === userId && (
              <span className="ml-2 text-xs text-gray-400">(your own training index)</span>
            )}
          </div>
          {canViewOthers && (
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border"
              style={{ borderColor: '#e5e7eb', color: '#2d6a4f' }}
            >
              {pickerOpen ? 'Cancel' : 'Search another person'}
            </button>
          )}
        </div>

        {pickerOpen && (
          <div className="mt-3">
            {selectedId !== userId && (
              <button
                onClick={() => selectPerson(userId)}
                className="mb-3 px-3 py-1.5 rounded-lg text-xs font-medium border"
                style={{ borderColor: '#e5e7eb', color: '#2d6a4f' }}
              >
                View my own training index ({userName})
              </button>
            )}

            <OrgFilterBar value={orgFilter} onChange={setOrgFilter} />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or employee ID..."
              autoFocus
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none mb-2"
              style={{ borderColor: '#e5e7eb' }}
            />

            <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
              {searchResults.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-400">
                  {search.trim() || orgFilter.departmentId ? 'No matching people found.' : 'Type a name, or pick a department/unit/section, to search.'}
                </div>
              ) : (
                searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectPerson(p.id)}
                    className="w-full text-left px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors"
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-400">
                        {p.employeeId} · {p.designation ?? '—'} · {p.department?.name ?? '—'}
                        {p.unit?.name ? ` → ${p.unit.name}` : ''}
                        {p.section?.name ? ` → ${p.section.name}` : ''}
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: 'Total trainings', value: filteredEntries.length, color: '#374151' },
          { label: 'Completed',       value: completed,      color: '#166534' },
          { label: 'Overdue',         value: overdue,        color: '#dc2626' },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border p-4 text-center"
            style={{ borderColor: '#e5e7eb' }}
          >
            <div className="text-2xl font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {entries.length > 0 && (
        <ReportFilterBar
          filters={filters}
          onChange={setFilters}
          statusOptions={STATUS_OPTIONS}
          dateFilters={DATE_FILTERS}
          searchPlaceholder="Search topic..."
        />
      )}

      {/* Index table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading training index...
        </div>
      ) : entries.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          No training records found for this person
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          No training records match the current filters.
        </div>
      ) : (
        <div
          className="bg-white rounded-xl border overflow-hidden"
          style={{ borderColor: '#e5e7eb' }}
        >
          {/* Training Index header */}
          <div
            className="px-5 py-4"
            style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}
          >
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Training Index — Format QbD/QA/F/007-09
            </div>
            {selectedPerson && (
              <div className="text-sm font-semibold text-gray-900 mt-1">
                {selectedPerson.name}{selectedPerson.employeeId ? ` · ${selectedPerson.employeeId}` : ''}
              </div>
            )}
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['#', 'Topic', 'Trigger', 'Status', 'Assigned date', 'Due date', 'Completed', 'Score', 'Assigned by'].map((h, i) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    style={i === 0 ? { width: '40px' } : {}}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry, idx) => {
                const statusStyle = STATUS_STYLES[entry.status] ?? STATUS_STYLES.NOT_STARTED
                return (
                  <tr
                    key={entry.id}
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-900">
                      {entry.topicName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: '#f5f3ff', color: '#6d28d9' }}
                      >
                        {entry.trigger}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={statusStyle}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(entry.assignedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(entry.dueDate)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {entry.completedAt ? formatDate(entry.completedAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {entry.score !== null ? (
                        <span
                          className="font-semibold"
                          style={{ color: (entry.score ?? 0) >= 80 ? '#166534' : '#dc2626' }}
                        >
                          {entry.score}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {entry.assignedBy}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
