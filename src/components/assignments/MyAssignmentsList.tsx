'use client'

import { useState, useEffect, useCallback } from 'react'
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
  completedAt:  string | null
  acknowledged: boolean
  topic: {
    id:          string
    name:        string
    description: string | null
    materials:   Material[]
  }
  assignedBy: { id: string; name: string }
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  NOT_STARTED: { bg: '#f9fafb', color: '#6b7280', label: 'Not started'  },
  IN_PROGRESS: { bg: '#eff6ff', color: '#1d4ed8', label: 'In progress'  },
  COMPLETED:   { bg: '#f0fdf4', color: '#166534', label: 'Completed'    },
  OVERDUE:     { bg: '#fef2f2', color: '#dc2626', label: 'Overdue'      },
  FAILED:      { bg: '#fef2f2', color: '#dc2626', label: 'Failed'       },
}

const TRIGGER_LABELS: Record<string, string> = {
  INDUCTION:  'Induction',
  UPGRADE:    'Role upgrade',
  RETRAINING: 'Retraining',
  REFRESHER:  'Refresher',
}

export function MyAssignmentsList() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [expanded,    setExpanded]    = useState<string | null>(null)
  const [ackLoading,  setAckLoading]  = useState<string | null>(null)

  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/assignments?view=mine')
    const data = await res.json()
    setAssignments(data.assignments ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  async function handleStart(assignmentId: string) {
    await fetch(`/api/assignments/${assignmentId}/start`, { method: 'POST' })
    fetchAssignments()
  }

  async function handleView(materialId: string, versionId: string) {
    const res  = await fetch(`/api/content/${materialId}/versions/${versionId}/view`)
    const data = await res.json()
    if (data.url) window.open(data.url, '_blank')
  }

  async function handleAcknowledge(assignmentId: string) {
    setAckLoading(assignmentId)
    await fetch(`/api/assignments/${assignmentId}/acknowledge`, { method: 'POST' })
    setAckLoading(null)
    fetchAssignments()
  }

  // Group by status for summary
  const counts = {
    pending: assignments.filter((a) => a.status !== 'COMPLETED').length,
    overdue: assignments.filter((a) => a.status === 'OVERDUE').length,
    done:    assignments.filter((a) => a.status === 'COMPLETED').length,
  }

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

      {/* Assignment list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading your training...
        </div>
      ) : assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          </svg>
          <p className="text-sm text-gray-400">No training assigned yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {assignments.map((a) => {
            const isExpanded = expanded === a.id
            const statusStyle = STATUS_STYLES[a.status] ?? STATUS_STYLES.NOT_STARTED
            const approvedMaterials = a.topic.materials.filter(
              (m) => m.versions.length > 0
            )
            const hasMajorUpdate = approvedMaterials.some(
              (m) => m.versions[0]?.versionType === 'MAJOR'
            )

            return (
              <div
                key={a.id}
                className="bg-white rounded-xl border overflow-hidden"
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

                    <button
                      onClick={() => setExpanded(isExpanded ? null : a.id)}
                      className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex-shrink-0"
                      style={{ borderColor: '#e5e7eb', color: '#374151' }}
                    >
                      {isExpanded ? 'Hide' : 'View material'}
                    </button>
                  </div>
                </div>

                {/* Expanded — materials */}
                {isExpanded && (
                  <div
                    className="px-5 pb-5"
                    style={{ borderTop: '1px solid #f3f4f6' }}
                  >
                    {approvedMaterials.length === 0 ? (
                      <p className="text-sm text-gray-400 pt-4">
                        No approved material available yet for this topic.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2 pt-4">
                        {approvedMaterials.map((material) => {
                          const version = material.versions[0]
                          return (
                            <div
                              key={material.id}
                              className="flex items-center justify-between p-3 rounded-lg"
                              style={{ background: '#fafafa' }}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ background: '#f0fdf4' }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                  </svg>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {material.title}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    v{version.versionLabel} · {version.fileType}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  if (a.status === 'NOT_STARTED') handleStart(a.id)
                                  handleView(material.id, version.id)
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                                style={{ background: '#2d6a4f' }}
                              >
                                Open
                              </button>
                            </div>
                          )
                        })}

                        {/* Acknowledge button — for non-completed, non-overdue */}
                        {a.status !== 'COMPLETED' && (
                          <div
                            className="flex items-center justify-between mt-2 p-3 rounded-lg border"
                            style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}
                          >
                            <div className="text-xs" style={{ color: '#166534' }}>
                              {a.acknowledged
                                ? '✓ You have acknowledged this material'
                                : 'After reviewing the material, confirm you have read and understood it'}
                            </div>
                            {!a.acknowledged && (
                              <button
                                onClick={() => handleAcknowledge(a.id)}
                                disabled={ackLoading === a.id}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex-shrink-0"
                                style={{ background: '#2d6a4f' }}
                              >
                                {ackLoading === a.id ? 'Saving...' : 'Read & understood'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}