'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

interface Material {
  id:             string
  title:          string
  currentVersion: number
  versions: {
    id:           string
    versionLabel: string
    versionType:  string
    fileType:     string
    status:       string
  }[]
}

interface Assignment {
  id:           string
  trigger:      string
  status:       string
  dueDate:      string
  startedAt:    string | null
  viewedAt:     string | null
  completedAt:  string | null
  acknowledged: boolean
  topic: {
    id:           string
    name:         string
    description:  string | null
    trainingType: string
    materials:    Material[]
  }
  assignedBy: { id: string; name: string }
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  NOT_STARTED:  { bg: '#f9fafb', color: '#6b7280', label: 'Not started'  },
  IN_PROGRESS:  { bg: '#eff6ff', color: '#1d4ed8', label: 'In progress'  },
  COMPLETED:    { bg: '#f0fdf4', color: '#166534', label: 'Completed'     },
  OVERDUE:      { bg: '#fef2f2', color: '#dc2626', label: 'Overdue'       },
  FAILED:       { bg: '#fff7ed', color: '#c2410c', label: 'Under review'  }, // ← changed label
  CANCELLED:    { bg: '#fef2f2', color: '#dc2626', label: 'Withdrawn'      },
}

const TRIGGER_LABELS: Record<string, string> = {
  INDUCTION:  'Induction',
  UPGRADE:    'Role upgrade',
  RETRAINING: 'Retraining',
  REFRESHER:  'Refresher',
}

const TRAINING_TYPE_LABELS: Record<string, string> = {
  MATERIAL_MCQ:         'Material + MCQ Assessment',
  MATERIAL_ONLY:        'Material Only',
  ACKNOWLEDGEMENT_ONLY: 'Acknowledgement Only',
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'ALL',         label: 'All' },
  { value: 'NOT_STARTED', label: 'Not started' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'OVERDUE',     label: 'Overdue' },
  { value: 'COMPLETED',   label: 'Completed' },
]

export function MyAssignmentsList() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const openId = searchParams.get('openId')

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [statusTab,   setStatusTab]   = useState('ALL')

  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/assignments?view=mine')
    const data = await res.json()
    setAssignments(data.assignments ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  // Deep-linked from the dashboard's "pending training" list — go straight to its detail page
  useEffect(() => {
    if (!openId) return
    router.replace(`/assignments/${openId}`)
  }, [openId, router])

  // Group by status for summary
  const counts = {
    pending: assignments.filter((a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED').length,
    overdue: assignments.filter((a) => a.status === 'OVERDUE').length,
    done:    assignments.filter((a) => a.status === 'COMPLETED').length,
  }

  const filteredAssignments = statusTab === 'ALL'
    ? assignments
    : assignments.filter((a) => a.status === statusTab)

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending', value: counts.pending, color: '#1d4ed8' },
          { label: 'Overdue', value: counts.overdue, color: '#dc2626' },
          { label: 'Completed', value: counts.done, color: '#166534' },
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

      {/* Status sub-tabs */}
      <div className="flex gap-1 mb-4 border-b" style={{ borderColor: '#e5e7eb' }}>
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatusTab(t.value)}
            className="px-3 py-2 text-sm font-medium transition-all border-b-2 -mb-px"
            style={{
              borderColor: statusTab === t.value ? '#2d6a4f' : 'transparent',
              color:       statusTab === t.value ? '#2d6a4f' : '#6b7280',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Assignment list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading your training...
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          </svg>
          <p className="text-sm text-gray-400">
            {statusTab === 'ALL' ? 'No training assigned yet' : 'No training in this status'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredAssignments.map((a) => {
            const statusStyle = STATUS_STYLES[a.status] ?? STATUS_STYLES.NOT_STARTED
            const trainingType = a.topic.trainingType

            return (
              <a
                key={a.id}
                id={`assignment-${a.id}`}
                href={`/assignments/${a.id}`}
                className="bg-white rounded-xl border overflow-hidden block hover:shadow-sm transition-shadow"
                style={{
                  borderColor: a.status === 'OVERDUE' ? '#fecaca' : '#e5e7eb',
                }}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {a.topic.name}
                        </h3>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={statusStyle}
                        >
                          {statusStyle.label}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: '#f5f3ff', color: '#6d28d9' }}
                        >
                          {TRIGGER_LABELS[a.trigger]}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: '#fefce8', color: '#854d0e' }}
                        >
                          {TRAINING_TYPE_LABELS[trainingType] ?? trainingType}
                        </span>
                      </div>
                      {a.topic.description && (
                        <p className="text-xs text-gray-500 mb-2">
                          {a.topic.description}
                        </p>
                      )}
                      <div className="text-xs text-gray-400">
                        Due {formatDate(a.dueDate)} &nbsp;·&nbsp;
                        Assigned by {a.assignedBy.name}
                      </div>
                    </div>

                    <span
                      className="px-3 py-1.5 rounded-lg border text-xs font-medium flex-shrink-0"
                      style={{ borderColor: '#e5e7eb', color: '#374151' }}
                    >
                      View details →
                    </span>
                  </div>
                </div>

                {/* Under review notice — shown when assignment is FAILED */}
                {a.status === 'FAILED' && (
                  <div
                    className="mx-5 mb-5 px-4 py-3 rounded-lg border text-xs"
                    style={{ background: '#fff7ed', borderColor: '#fed7aa', color: '#92400e' }}
                  >
                    <div className="font-semibold mb-0.5">
                      ⚠️ Training under coordinator review
                    </div>
                    <div>
                      You have been unable to achieve competency on this topic after the
                      maximum number of retraining cycles. Your Training Coordinator has
                      been notified and will contact you regarding next steps.
                      Please speak with your manager in the meantime.
                    </div>
                  </div>
                )}
              </a>
            )
          })}
        </div>
      )}
    </>
  )
}
