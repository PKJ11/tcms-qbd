'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'
import { JustificationModal } from '@/components/JustificationModal'
import { OrgFilterBar, EMPTY_ORG_FILTER, orgFilterParams, type OrgFilterValue } from '@/components/shared/OrgFilterBar'

interface Assignment {
  id:          string
  status:      string
  dueDate:     string
  createdAt:   string
  person:      { id: string; name: string; employeeId: string }
  topic:       { id: string; name: string }
}

interface Topic { id: string; name: string }

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  NOT_STARTED: { bg: '#f9fafb', color: '#6b7280', label: 'Not started' },
  IN_PROGRESS: { bg: '#eff6ff', color: '#1d4ed8', label: 'In progress' },
  COMPLETED:   { bg: '#f0fdf4', color: '#166534', label: 'Completed'   },
  OVERDUE:     { bg: '#fef2f2', color: '#dc2626', label: 'Overdue'     },
  FAILED:      { bg: '#fff7ed', color: '#c2410c', label: 'Under review' },
  CANCELLED:   { bg: '#fef2f2', color: '#dc2626', label: 'Withdrawn'    },
}

export function MyAssignedTrainingsStatus({ canRevert }: { canRevert?: boolean }) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [orgFilter,    setOrgFilter]    = useState<OrgFilterValue>(EMPTY_ORG_FILTER)
  const [topicId,       setTopicId]     = useState('')
  const [revertTarget, setRevertTarget] = useState<Assignment | null>(null)
  const [modalLoading, setModalLoading] = useState(false)

  const [topics,        setTopics]        = useState<Topic[]>([])
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkLoading,   setBulkLoading]   = useState(false)
  const [bulkResult,    setBulkResult]    = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/topics?isActive=true').then((r) => r.json()).then((d) => setTopics(d.topics ?? []))
  }, [])

  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ view: 'assigned-by-me', ...orgFilterParams(orgFilter) })
    if (statusFilter) params.set('status', statusFilter)
    if (topicId)      params.set('topicId', topicId)
    const res  = await fetch(`/api/assignments?${params}`)
    const data = await res.json()
    setAssignments(data.assignments ?? [])
    setLoading(false)
  }, [statusFilter, orgFilter, topicId])

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  async function handleRevert(justification: string) {
    if (!revertTarget) return
    setModalLoading(true)

    await fetch(`/api/assignments/${revertTarget.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'revert', justification }),
    })

    setModalLoading(false)
    setRevertTarget(null)
    fetchAssignments()
  }

  const eligible     = assignments.filter((a) => a.status === 'NOT_STARTED')
  const skippedCount = assignments.length - eligible.length

  async function handleBulkRevert(justification: string) {
    setBulkLoading(true)

    const res  = await fetch('/api/assignments/bulk-revert', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ assignmentIds: eligible.map((a) => a.id), justification }),
    })
    const data = await res.json()
    setBulkLoading(false)
    setBulkModalOpen(false)

    if (!res.ok) {
      setBulkResult(`Error: ${data.message}`)
      return
    }

    setBulkResult(
      `Reverted ${data.reverted} assignment${data.reverted !== 1 ? 's' : ''}.` +
      (data.skipped?.length ? ` ${data.skipped.length} skipped — already in progress or completed.` : '')
    )
    fetchAssignments()
  }

  const counts = {
    total:       assignments.length,
    completed:   assignments.filter((a) => a.status === 'COMPLETED').length,
    inProgress:  assignments.filter((a) => a.status === 'IN_PROGRESS' || a.status === 'NOT_STARTED').length,
    overdue:     assignments.filter((a) => a.status === 'OVERDUE').length,
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total assigned', value: counts.total,      color: '#374151' },
          { label: 'Completed',      value: counts.completed,  color: '#166534' },
          { label: 'In progress',    value: counts.inProgress, color: '#1d4ed8' },
          { label: 'Overdue',        value: counts.overdue,    color: '#dc2626' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-4 text-center" style={{ borderColor: '#e5e7eb' }}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-gray-700">Trainings you've assigned</h2>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-xs outline-none"
            style={{ borderColor: '#e5e7eb' }}
          >
            <option value="">All statuses</option>
            {Object.keys(STATUS_STYLES).map((s) => (
              <option key={s} value={s}>{STATUS_STYLES[s].label}</option>
            ))}
          </select>

          <OrgFilterBar value={orgFilter} onChange={setOrgFilter} />

          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-xs outline-none"
            style={{ borderColor: '#e5e7eb' }}
          >
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {canRevert && eligible.length > 0 && (
            <button
              onClick={() => setBulkModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium"
              style={{ borderColor: '#fecaca', color: '#dc2626' }}
            >
              Revert all ({eligible.length} eligible)
            </button>
          )}
        </div>
      </div>

      {bulkResult && (
        <div
          className="text-sm px-4 py-3 rounded-lg border mb-3"
          style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}
        >
          {bulkResult}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading...
        </div>
      ) : assignments.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          You haven't assigned any training yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Trainee', 'Topic', 'Status', 'Assigned', 'Due date', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => {
                const style = STATUS_STYLES[a.status] ?? STATUS_STYLES.NOT_STARTED
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{a.person.name}</div>
                      <div className="text-xs text-gray-400">{a.person.employeeId}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{a.topic.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={style}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(a.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(a.dueDate)}</td>
                    <td className="px-4 py-3 text-right">
                      {canRevert && a.status === 'NOT_STARTED' && (
                        <button
                          onClick={() => setRevertTarget(a)}
                          className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                          style={{ borderColor: '#fecaca', color: '#dc2626' }}
                        >
                          Revert
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <JustificationModal
        isOpen={!!revertTarget}
        title={`Revert assignment for ${revertTarget?.person.name ?? ''}`}
        description={`"${revertTarget?.topic.name ?? ''}" will be withdrawn and ${revertTarget?.person.name ?? 'the trainee'} will be notified. This can only be done before they've started it.`}
        onConfirm={handleRevert}
        onCancel={() => setRevertTarget(null)}
        loading={modalLoading}
      />

      <JustificationModal
        isOpen={bulkModalOpen}
        title="Revert all filtered assignments"
        description={
          `This will withdraw ${eligible.length} assignment${eligible.length !== 1 ? 's' : ''} ` +
          `matching your current filters that haven't been started yet, and notify each trainee.` +
          (skippedCount > 0
            ? ` ${skippedCount} other filtered assignment${skippedCount !== 1 ? 's are' : ' is'} already in progress or completed and will be left untouched.`
            : '')
        }
        onConfirm={handleBulkRevert}
        onCancel={() => setBulkModalOpen(false)}
        loading={bulkLoading}
      />
    </div>
  )
}
