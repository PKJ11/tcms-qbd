'use client'

import { useState, useCallback, useEffect } from 'react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { MaterialViewerModal } from './MaterialViewerModal'

interface MaterialVersion {
  id:           string
  versionLabel: string
  fileType:     string
  fileUrl:      string
  status:       string
}

interface Material {
  id:             string
  title:          string
  currentVersion: number
  versions:       MaterialVersion[]
}

interface Assignment {
  id:           string
  trigger:      string
  status:       string
  dueDate:      string | Date
  startedAt:    string | Date | null
  viewedAt:     string | Date | null
  completedAt:  string | Date | null
  acknowledged: boolean
  topic: {
    id:           string
    name:         string
    description:  string | null
    trainingType: string
    materials:    Material[]
  }
  assignedBy: { id: string; name: string }
  materialConfirmations: { materialId: string; confirmedAt: string | Date }[]
  questionBankVersion: { versionNo: number; versionLabel: string } | null
  materialVersions: {
    materialId:      string
    materialVersion: { versionNo: number; versionLabel: string }
  }[]
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  NOT_STARTED:  { bg: '#f9fafb', color: '#6b7280', label: 'Not started'  },
  IN_PROGRESS:  { bg: '#eff6ff', color: '#1d4ed8', label: 'In progress'  },
  COMPLETED:    { bg: '#f0fdf4', color: '#166534', label: 'Completed'     },
  OVERDUE:      { bg: '#fef2f2', color: '#dc2626', label: 'Overdue'       },
  FAILED:       { bg: '#fff7ed', color: '#c2410c', label: 'Under review'  },
  CANCELLED:    { bg: '#fef2f2', color: '#dc2626', label: 'Withdrawn'      },
}

const TRIGGER_LABELS: Record<string, string> = {
  INDUCTION: 'Induction',
  SCHEDULE:  'Schedule',
  REFRESHER: 'Refresher',
  SOP_SELF_READOUT: 'SOP Self Readout',
}

const TRAINING_TYPE_LABELS: Record<string, string> = {
  MATERIAL_MCQ:         'Material + MCQ Assessment',
  MATERIAL_ONLY:        'Material Only',
  ACKNOWLEDGEMENT_ONLY: 'Acknowledgement Only',
  SOP_SELF_READOUT:     'SOP Self Readout',
}

const OUTCOME_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  PASS:             { bg: '#f0fdf4', color: '#166534', label: 'Passed' },
  FAIL:             { bg: '#fefce8', color: '#854d0e', label: 'Not passed' },
  NEEDS_RETRAINING: { bg: '#fef2f2', color: '#dc2626', label: 'Needs retraining' },
}

interface Attempt {
  id:          string
  attemptNo:   number
  score:       number
  outcome:     string
  submittedAt: string | Date
}

export function AssignmentDetailView({ initialAssignment }: { initialAssignment: Assignment }) {
  const [assignment, setAssignment] = useState(initialAssignment)
  const [viewerMaterial, setViewerMaterial] = useState<Material | null>(null)
  const [ackLoading, setAckLoading] = useState(false)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [passMark, setPassMark] = useState<number | null>(null)

  const refetch = useCallback(async () => {
    const res  = await fetch(`/api/assignments/${initialAssignment.id}`)
    const data = await res.json()
    if (data.assignment) setAssignment(data.assignment)
  }, [initialAssignment.id])

  useEffect(() => {
    if (initialAssignment.topic.trainingType !== 'MATERIAL_MCQ') return

    async function fetchResults() {
      const [attemptsRes, bankRes] = await Promise.all([
        fetch(`/api/assessments/attempts?assignmentId=${initialAssignment.id}`),
        fetch(`/api/assessments/topic/${initialAssignment.topic.id}`),
      ])
      const attemptsData = await attemptsRes.json()
      const bankData     = await bankRes.json()
      setAttempts(attemptsData.attempts ?? [])
      setPassMark(bankData.bank?.passingPercentage ?? null)
    }
    fetchResults()
  }, [initialAssignment.id, initialAssignment.topic.id, initialAssignment.topic.trainingType])

  async function handleAcknowledge() {
    setAckLoading(true)
    await fetch(`/api/assignments/${assignment.id}/acknowledge`, { method: 'POST' })
    setAckLoading(false)
    refetch()
  }

  const trainingType       = assignment.topic.trainingType
  const approvedMaterials  = assignment.topic.materials.filter((m) => m.versions.length > 0)
  const confirmedIds       = new Set(assignment.materialConfirmations.map((c) => c.materialId))
  const allConfirmed       = approvedMaterials.length > 0 &&
    approvedMaterials.every((m) => confirmedIds.has(m.id))
  const statusStyle = STATUS_STYLES[assignment.status] ?? STATUS_STYLES.NOT_STARTED

  return (
    <>
      <div className="bg-white rounded-2xl border p-6 mb-4" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h1 className="text-xl font-bold text-gray-900">{assignment.topic.name}</h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={statusStyle}>
            {statusStyle.label}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: '#f5f3ff', color: '#6d28d9' }}
          >
            {TRIGGER_LABELS[assignment.trigger]}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: '#fefce8', color: '#854d0e' }}
          >
            {TRAINING_TYPE_LABELS[trainingType] ?? trainingType}
          </span>
        </div>
        {assignment.topic.description && (
          <p className="text-sm text-gray-500 mb-2">{assignment.topic.description}</p>
        )}
        <div className="text-xs text-gray-400">
          Due {formatDate(assignment.dueDate)} &nbsp;·&nbsp; Assigned by {assignment.assignedBy.name}
          {trainingType === 'MATERIAL_MCQ' && assignment.questionBankVersion && (
            <>
              &nbsp;·&nbsp; Questions v{assignment.questionBankVersion.versionNo}
              {' '}({assignment.questionBankVersion.versionLabel}) used for this assignment
            </>
          )}
        </div>

        {assignment.status === 'FAILED' && (
          <div
            className="mt-4 px-4 py-3 rounded-lg border text-xs"
            style={{ background: '#fff7ed', borderColor: '#fed7aa', color: '#92400e' }}
          >
            <div className="font-semibold mb-0.5">⚠️ Training under coordinator review</div>
            <div>
              You have been unable to achieve competency on this topic after the maximum number
              of retraining cycles. Your Training Coordinator has been notified and will contact
              you regarding next steps. Please speak with your manager in the meantime.
            </div>
          </div>
        )}

        {assignment.status === 'CANCELLED' && (
          <div
            className="mt-4 px-4 py-3 rounded-lg border text-xs"
            style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}
          >
            <div className="font-semibold">This training assignment was withdrawn.</div>
            <div>No action is needed from you.</div>
          </div>
        )}
      </div>

      {trainingType === 'MATERIAL_MCQ' && attempts.length > 0 && (
        <div className="bg-white rounded-2xl border p-6 mb-4" style={{ borderColor: '#e5e7eb' }}>
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Assessment results</h2>
          <div className="flex flex-col gap-2">
            {attempts.map((attempt) => {
              const outcomeStyle = OUTCOME_STYLES[attempt.outcome] ?? OUTCOME_STYLES.FAIL
              return (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: '#fafafa' }}
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Attempt {attempt.attemptNo}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDateTime(attempt.submittedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{attempt.score}%</div>
                      {passMark !== null && (
                        <div className="text-xs text-gray-400">Pass mark {passMark}%</div>
                      )}
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={outcomeStyle}
                    >
                      {outcomeStyle.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border p-6 mb-4" style={{ borderColor: '#e5e7eb' }}>
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Training material</h2>

        {approvedMaterials.length === 0 ? (
          <p className="text-sm text-gray-400">No approved material available yet for this topic.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {approvedMaterials.map((material) => {
              const confirmed  = confirmedIds.has(material.id)
              const version    = material.versions[0]
              const pinned     = assignment.materialVersions.find((mv) => mv.materialId === material.id)?.materialVersion
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
                      <div className="text-sm font-medium text-gray-900">{material.title}</div>
                      <div className="text-xs text-gray-400">
                        v{version.versionLabel} · {version.fileType}
                        {pinned && pinned.versionLabel !== version.versionLabel && (
                          <> · pinned to v{pinned.versionNo} ({pinned.versionLabel}) at assignment time</>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {confirmed && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: '#f0fdf4', color: '#166534' }}
                      >
                        ✓ Confirmed
                      </span>
                    )}
                    <button
                      onClick={() => setViewerMaterial(material)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                      style={{ background: '#2d6a4f' }}
                    >
                      View
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Bottom action, branched by training type */}
        {assignment.status !== 'COMPLETED' && assignment.status !== 'CANCELLED' && (
          <div className="mt-4">
            {(trainingType === 'MATERIAL_ONLY' || trainingType === 'SOP_SELF_READOUT') && (
              <div
                className="p-3 rounded-lg border text-xs"
                style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}
              >
                Confirming every material above marks this training as completed.
              </div>
            )}

            {trainingType === 'ACKNOWLEDGEMENT_ONLY' && (
              <div
                className="flex items-center justify-between p-3 rounded-lg border"
                style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}
              >
                <div className="text-xs" style={{ color: '#166534' }}>
                  {assignment.acknowledged
                    ? '✓ You have acknowledged this material'
                    : 'After reviewing the material above, confirm you have read and understood it'}
                </div>
                {!assignment.acknowledged && (
                  <button
                    onClick={handleAcknowledge}
                    disabled={ackLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex-shrink-0"
                    style={{ background: '#2d6a4f' }}
                  >
                    {ackLoading ? 'Saving...' : 'Read & understood'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2 · Assessment — a distinct, sequential step: locked until every
          material above is confirmed, then unlocks into a clear call to action. */}
      {trainingType === 'MATERIAL_MCQ' &&
        assignment.status !== 'COMPLETED' &&
        assignment.status !== 'CANCELLED' && (
        <div
          className="bg-white rounded-2xl border p-6 mb-4"
          style={{ borderColor: allConfirmed ? '#bbf7d0' : '#e5e7eb' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
              style={{
                background: allConfirmed ? '#2d6a4f' : '#f3f4f6',
                color:      allConfirmed ? '#fff'    : '#9ca3af',
              }}
            >
              {allConfirmed ? '✓' : '2'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-gray-900">Step 2 · Assessment</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {allConfirmed
                  ? 'All materials reviewed — you\'re ready to begin.'
                  : approvedMaterials.length === 0
                  ? 'No material available yet for this topic — the assessment isn\'t unlocked.'
                  : `Confirm every material above first (${confirmedIds.size}/${approvedMaterials.length} confirmed) to unlock the assessment.`}
              </p>
            </div>
          </div>

          <div className="mt-4">
            {allConfirmed ? (
              <a
                href={`/assignments/${assignment.id}/assessment`}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-transform"
                style={{ background: '#2d6a4f' }}
              >
                Start the assessment for this topic
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </a>
            ) : (
              <div
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold cursor-not-allowed select-none"
                style={{ background: '#f3f4f6', color: '#9ca3af' }}
                title="Confirm every material above to unlock the assessment"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Assessment locked
              </div>
            )}
          </div>
        </div>
      )}

      {viewerMaterial && (
        <MaterialViewerModal
          assignmentId={assignment.id}
          material={viewerMaterial}
          trainingType={trainingType}
          onClose={() => setViewerMaterial(null)}
          onConfirmed={() => { setViewerMaterial(null); refetch() }}
        />
      )}
    </>
  )
}
