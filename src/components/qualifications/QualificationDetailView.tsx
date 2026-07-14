'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'
import { JustificationModal } from '@/components/JustificationModal'
import { ApprovalSignModal }  from './ApprovalSignModal'

interface Signatory {
  id:            string
  stepOrder:     number
  requiredRole:  string
  status:        string
  signedAt:      string | null
  justification: string | null
  signedBy:      { id: string; name: string } | null
}

interface ScannedDoc {
  id:          string
  fileName:    string
  fileType:    string
  description: string
  uploadedAt:  string
  uploadedBy:  { id: string; name: string }
}

interface Qualification {
  id:          string
  status:      string
  outcome:     string | null
  performedOn: string | null
  initiatedAt: string
  approvedAt:  string | null
  person:      { id: string; name: string; employeeId: string }
  technique:   { id: string; name: string; code: string; type: string }
  supervisor:  { id: string; name: string } | null
  initiatedBy: { id: string; name: string }
  signatories: Signatory[]
  certificate: { id: string; certNumber: string; issuedAt: string; fileUrl: string } | null
  _count:      { scannedDocuments: number }
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  INITIATED:   { bg: '#f5f3ff', color: '#6d28d9', label: 'Initiated'   },
  IN_PROGRESS: { bg: '#eff6ff', color: '#1d4ed8', label: 'In progress' },
  APPROVED:    { bg: '#f0fdf4', color: '#166534', label: 'Approved'    },
  EXPIRED:     { bg: '#fef2f2', color: '#dc2626', label: 'Expired'     },
  REVOKED:     { bg: '#f9fafb', color: '#6b7280', label: 'Revoked'     },
}

const STEP_LABELS: Record<string, string> = {
  QC_TRAINER: 'QC department Trainer sign-off',
  QA_TRAINER: 'QA department Trainer final approval',
}

const FILE_ICONS: Record<string, string> = {
  pdf: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️',
}

interface Props {
  qualificationId: string
  canUpload:       boolean
  canSignQc:       boolean
  canSignQa:       boolean
  canReject:       boolean
}

function Toast({ message, type, onClose }: {
  message: string
  type:    'success' | 'error'
  onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg"
      style={{
        background: type === 'success' ? '#f0fdf4' : '#fef2f2',
        border:     `1px solid ${type === 'success' ? '#bbf7d0' : '#fecaca'}`,
        color:      type === 'success' ? '#166534' : '#dc2626',
        minWidth:   '260px',
      }}
    >
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-auto opacity-60 hover:opacity-100">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}

export function QualificationDetailView({
  qualificationId,
  canUpload,
  canSignQc,
  canSignQa,
  canReject,
}: Props) {
  const [qual,      setQual]      = useState<Qualification | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [docs,        setDocs]        = useState<ScannedDoc[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [file,        setFile]        = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [uploading,   setUploading]   = useState(false)
  const [viewingUrl,  setViewingUrl]  = useState<string | null>(null)
  const [viewingName, setViewingName] = useState('')

  const [showSignModal,   setShowSignModal]   = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [actionLoading,   setActionLoading]   = useState(false)
  const [modalError,      setModalError]      = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type })

  const fetchQual = useCallback(async () => {
    setLoading(true)
    const res  = await fetch(`/api/qualifications/${qualificationId}`)
    const data = await res.json()
    setQual(data.qualification ?? null)
    setLoading(false)
  }, [qualificationId])

  const fetchDocs = useCallback(async () => {
    setLoadingDocs(true)
    const res  = await fetch(`/api/qualifications/${qualificationId}/documents`)
    const data = await res.json()
    setDocs(data.documents ?? [])
    setLoadingDocs(false)
  }, [qualificationId])

  useEffect(() => { fetchQual() }, [fetchQual])
  useEffect(() => { fetchDocs() }, [fetchDocs])

  async function handleUpload() {
    if (!file || !description.trim()) {
      showToast('File and description are required', 'error')
      return
    }
    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('description', description)

    const res  = await fetch(`/api/qualifications/${qualificationId}/documents`, { method: 'POST', body: formData })
    const data = await res.json()
    setUploading(false)

    if (!res.ok) {
      showToast(data.message ?? 'Upload failed', 'error')
      return
    }

    setFile(null)
    setDescription('')
    const fileInput = document.getElementById('detail-file-input') as HTMLInputElement
    if (fileInput) fileInput.value = ''

    await fetchDocs()
    await fetchQual()
    showToast('Document uploaded successfully')
  }

  async function handleView(docId: string, fileName: string) {
    const res  = await fetch(`/api/qualifications/${qualificationId}/documents/${docId}/url`)
    const data = await res.json()
    if (data.url) {
      setViewingUrl(data.url)
      setViewingName(fileName)
    }
  }

  async function handleSign(justification: string, password: string) {
    setActionLoading(true)
    setModalError(null)

    const res  = await fetch(`/api/qualifications/${qualificationId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'sign', justification, password }),
    })
    const data = await res.json()
    setActionLoading(false)

    if (!res.ok) {
      setModalError(data.message ?? 'Sign-off failed')
      return
    }

    setShowSignModal(false)
    showToast(data.fullyApproved ? '🏆 Qualification fully approved! Certificate generated.' : '✓ Step signed successfully')
    fetchQual()
  }

  async function handleReject(justification: string) {
    setActionLoading(true)
    setModalError(null)

    const res  = await fetch(`/api/qualifications/${qualificationId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'reject', justification }),
    })
    const data = await res.json()
    setActionLoading(false)

    if (!res.ok) {
      setModalError(data.message ?? 'Rejection failed')
      return
    }

    setShowRejectModal(false)
    showToast('Qualification rejected', 'error')
    fetchQual()
  }

  if (loading || !qual) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Loading qualification record...
      </div>
    )
  }

  const statusStyle  = STATUS_STYLES[qual.status] ?? STATUS_STYLES.IN_PROGRESS
  const nextStep     = qual.signatories.find((s) => s.status === 'PENDING')
  const hasEvidence  = qual._count.scannedDocuments > 0
  const canApproveNextStep =
    qual.status === 'IN_PROGRESS' && nextStep
      ? (nextStep.stepOrder === 1 ? canSignQc && hasEvidence : canSignQa)
      : false

  return (
    <>
      {/* Header card */}
      <div className="bg-white rounded-2xl border p-5 mb-4 flex items-start justify-between" style={{ borderColor: '#e5e7eb' }}>
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={statusStyle}>
              {statusStyle.label}
            </span>
            <span className="text-xs text-gray-400">{qual.person.employeeId}</span>
          </div>
          <div className="text-xs text-gray-400">
            Performed: {qual.performedOn ? formatDate(qual.performedOn) : '—'}
            &nbsp;·&nbsp;
            Supervised by: {qual.supervisor?.name ?? '—'}
          </div>
          {qual.certificate && (
            <div className="mt-2">
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: '#f0fdf4', color: '#166534' }}>
                🏆 {qual.certificate.certNumber} · Issued {formatDate(qual.certificate.issuedAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Step 1 — Evidence documents */}
      <div className="bg-white rounded-2xl border p-5 mb-4" style={{ borderColor: '#e5e7eb' }}>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Step 1 — Evidence documents</h3>
        <p className="text-xs text-gray-500 mb-4">Uploaded by the QA department (Trainer/Trainee).</p>

        {loadingDocs ? (
          <p className="text-xs text-gray-400 mb-3">Loading documents...</p>
        ) : docs.length === 0 ? (
          <p className="text-xs text-gray-400 mb-3">No evidence documents uploaded yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border group cursor-pointer hover:shadow-sm transition-shadow"
                style={{ borderColor: '#e5e7eb', background: '#fafafa', maxWidth: '220px' }}
                onClick={() => handleView(doc.id, doc.fileName)}
                title={`Click to view — ${doc.description}`}
              >
                <span className="text-base flex-shrink-0">{FILE_ICONS[doc.fileType] ?? '📎'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800 truncate" title={doc.fileName}>{doc.fileName}</div>
                  <div className="text-xs text-gray-400 truncate" title={doc.description}>{doc.description}</div>
                  <div className="text-xs text-gray-300">{formatDate(doc.uploadedAt)} · {doc.uploadedBy.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {canUpload && (qual.status === 'INITIATED' || qual.status === 'IN_PROGRESS') && (
          <div className="flex flex-col gap-2 p-3 rounded-lg border" style={{ borderColor: '#e5e7eb', background: '#fafafa' }}>
            <p className="text-xs font-medium text-gray-600">Upload evidence document</p>
            <input
              type="text"
              placeholder="Description (e.g. Bench worksheet 30-Jun-2026)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
              style={{ borderColor: '#e5e7eb', background: '#fff' }}
            />
            <div className="flex items-center gap-2">
              <input
                id="detail-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-xs text-gray-500 flex-1"
              />
              <button
                onClick={handleUpload}
                disabled={uploading || !file || !description.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex-shrink-0 disabled:opacity-40"
                style={{ background: '#2d6a4f' }}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
            <p className="text-xs text-gray-400">Accepted: PDF, JPG, PNG · Max 20MB</p>
          </div>
        )}
      </div>

      {/* Steps 2 & 3 — signatory chain */}
      {qual.signatories.map((s) => {
        const isCurrent = nextStep?.id === s.id
        return (
          <div key={s.id} className="bg-white rounded-2xl border p-5 mb-4" style={{ borderColor: '#e5e7eb' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Step {s.stepOrder + 1} — {STEP_LABELS[s.requiredRole] ?? s.requiredRole.replace(/_/g, ' ')}
                </h3>
                <div
                  className="inline-block px-2 py-1 rounded-lg text-xs"
                  style={{
                    background: s.status === 'SIGNED'   ? '#f0fdf4'
                              : s.status === 'REJECTED' ? '#fef2f2'
                              : '#fafafa',
                    color:      s.status === 'SIGNED'   ? '#166534'
                              : s.status === 'REJECTED' ? '#dc2626'
                              : '#6b7280',
                  }}
                >
                  {s.status === 'SIGNED'
                    ? `✓ Signed by ${s.signedBy?.name} · ${formatDate(s.signedAt!)}`
                    : s.status === 'REJECTED'
                    ? '✗ Rejected'
                    : '⏳ Pending'}
                </div>
                {s.justification && s.status === 'SIGNED' && (
                  <p className="text-xs italic text-gray-500 mt-1">&quot;{s.justification}&quot;</p>
                )}
                {isCurrent && s.stepOrder === 1 && !hasEvidence && (
                  <p className="text-xs mt-2" style={{ color: '#ca8a04' }}>
                    Upload at least one evidence document before this step can be signed.
                  </p>
                )}
              </div>

              {isCurrent && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {canApproveNextStep && (
                    <button
                      onClick={() => { setModalError(null); setShowSignModal(true) }}
                      className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                      style={{ borderColor: '#bbf7d0', color: '#166534' }}
                    >
                      Approve
                    </button>
                  )}
                  {canReject && qual.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => { setModalError(null); setShowRejectModal(true) }}
                      className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                      style={{ borderColor: '#fecaca', color: '#dc2626' }}
                    >
                      Reject
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Sign modal */}
      <ApprovalSignModal
        isOpen={showSignModal}
        title={`Sign off — ${qual.person.name}`}
        description={`Confirm that ${qual.person.name} has demonstrated competency on ${qual.technique.name}.`}
        error={modalError}
        loading={actionLoading}
        onConfirm={handleSign}
        onCancel={() => { setShowSignModal(false); setModalError(null) }}
      />

      {/* Reject modal */}
      <JustificationModal
        isOpen={showRejectModal}
        title={`Reject — ${qual.person.name}`}
        description="This will mark the analyst as Not Yet Competent and revoke the record."
        onConfirm={handleReject}
        onCancel={() => { setShowRejectModal(false); setModalError(null) }}
        loading={actionLoading}
      />

      {/* Document viewer modal */}
      {viewingUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl" style={{ width: '90vw', height: '85vh', maxWidth: '900px' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#e5e7eb' }}>
              <span className="text-sm font-medium text-gray-900">{viewingName}</span>
              <div className="flex items-center gap-2">
                <a href={viewingUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: '#2d6a4f' }}>
                  Open in new tab ↗
                </a>
                <button onClick={() => { setViewingUrl(null); setViewingName('') }} className="px-3 py-1.5 rounded-lg text-xs border font-medium" style={{ borderColor: '#e5e7eb', color: '#374151' }}>
                  Close
                </button>
              </div>
            </div>
            <div className="w-full h-full">
              {viewingName.toLowerCase().endsWith('.pdf') ? (
                <iframe src={viewingUrl} className="w-full" style={{ height: 'calc(85vh - 52px)' }} title={viewingName} />
              ) : (
                <div className="flex items-center justify-center h-full p-8">
                  <img src={viewingUrl} alt={viewingName} className="max-w-full max-h-full object-contain rounded-lg" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
