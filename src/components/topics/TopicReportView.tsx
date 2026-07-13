'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { TopicAssignmentsTable, type TopicTrainee } from '@/components/reports/TopicAssignmentsTable'
import { ReportFilterBar, EMPTY_REPORT_FILTERS, matchesReportFilters, type ReportFilters } from '@/components/reports/ReportFilterBar'

const STATUS_OPTIONS = [
  { value: 'COMPLETED',   label: 'Completed' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'NOT_STARTED', label: 'Not started' },
  { value: 'OVERDUE',     label: 'Overdue' },
  { value: 'FAILED',      label: 'Failed' },
]

interface Report {
  topicId:     string
  topicName:   string
  trainerName: string
  trainees:    TopicTrainee[]
}

type ViewKey = 'all' | 'team' | 'reportees' | 'mine'

interface Props {
  topicId:         string
  canViewAll:      boolean
  directReportIds: string[]
  teamIds:         string[]
}

const ALL_VIEWS: { key: ViewKey; label: string; description: string }[] = [
  { key: 'all',       label: 'All org-wide',   description: 'Everyone in the organisation assigned this training' },
  { key: 'team',      label: 'My team',        description: 'Your reports, and their reports, all the way down' },
  { key: 'reportees', label: 'My reportees',   description: 'Only the people who report to you directly' },
  { key: 'mine',      label: 'Assigned by me', description: 'Only the people you personally assigned this training to' },
]

export function TopicReportView({ topicId, canViewAll, directReportIds, teamIds }: Props) {
  const visibleViews = ALL_VIEWS.filter((v) => v.key !== 'all' || canViewAll)
  const [view,    setView]    = useState<ViewKey>(canViewAll ? 'all' : 'team')
  const [report,  setReport]  = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_REPORT_FILTERS)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    const res  = await fetch(`/api/reports/topic-completion?topicId=${topicId}&scope=${view}`)
    const data = await res.json()
    setReport(data.report ?? null)
    setLoading(false)
  }, [topicId, view])

  useEffect(() => { fetchReport() }, [fetchReport])

  function handleExport() {
    window.open(`/api/reports/topic-completion?topicId=${topicId}&scope=${view}&format=csv`, '_blank')
  }

  const scopedCount = view === 'team' ? teamIds.length : view === 'reportees' ? directReportIds.length : null

  const filteredTrainees = useMemo(() => {
    if (!report) return []
    return report.trainees.filter((t) => matchesReportFilters(filters, {
      name: t.name, employeeId: t.employeeId, status: t.status,
      dates: [t.assignedAt, t.dueDate, t.completedAt],
    }))
  }, [report, filters])

  const completedCount = filteredTrainees.filter((t) => t.status === 'COMPLETED').length

  return (
    <div>
      {/* View selector */}
      <div
        className="flex gap-1 mb-4 bg-white rounded-xl border p-1"
        style={{ borderColor: '#e5e7eb' }}
      >
        {visibleViews.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            title={v.description}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
            style={{
              background: view === v.key ? '#2d6a4f' : 'transparent',
              color:      view === v.key ? '#fff'    : '#6b7280',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {(view === 'team' || view === 'reportees') && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-4 text-sm"
          style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}
        >
          <span>
            Scoped to <strong>{scopedCount} {view === 'team' ? 'team member' : 'direct report'}{scopedCount !== 1 ? 's' : ''}</strong>
            {view === 'team' ? ' (your reports, and theirs, all the way down).' : ' (direct reports only).'}
          </span>
        </div>
      )}
      {view === 'mine' && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-4 text-sm"
          style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}
        >
          <span>Showing only the people <strong>you personally assigned</strong> this training to.</span>
        </div>
      )}

      <div
        className="bg-white rounded-xl border overflow-hidden"
        style={{ borderColor: '#e5e7eb' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}
        >
          <div className="text-xs text-gray-500">
            {report ? `${completedCount} / ${filteredTrainees.length} completed` : ''}
          </div>
          <button
            onClick={handleExport}
            disabled={!report}
            className="px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 disabled:opacity-40"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            Loading report...
          </div>
        ) : !report ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            Topic not found
          </div>
        ) : (
          <>
            <div className="px-5 pt-4">
              <ReportFilterBar filters={filters} onChange={setFilters} statusOptions={STATUS_OPTIONS} />
            </div>
            <TopicAssignmentsTable
              trainees={filteredTrainees}
              emptyMessage={
                report.trainees.length > 0
                  ? 'No trainees match the current filters.'
                  : view === 'mine'
                    ? "You haven't assigned this training to anyone yet."
                    : 'No one in this scope has been assigned this topic yet.'
              }
            />
          </>
        )}
      </div>
    </div>
  )
}
