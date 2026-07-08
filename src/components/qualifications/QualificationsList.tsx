'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

interface Signatory {
  id:           string
  stepOrder:    number
  requiredRole: string
  status:       string
  signedAt:     string | null
  justification: string | null
  signedBy:     { id: string; name: string } | null
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
  expiryDate:  string | null
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

interface Props {
  canManage:     boolean
  canCreate:     boolean
  currentUserId: string
  isOrgWide:     boolean    // ← new
  isSubScope:    boolean    // ← new
}

// ── Toast component ───────────────────────────────────────────────

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
        background:  type === 'success' ? '#f0fdf4' : '#fef2f2',
        border:      `1px solid ${type === 'success' ? '#bbf7d0' : '#fecaca'}`,
        color:       type === 'success' ? '#166534' : '#dc2626',
        minWidth:    '260px',
      }}
    >
      {type === 'success' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      )}
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

// ── Main list component ───────────────────────────────────────────

export function QualificationsList({ canManage, canCreate, currentUserId ,isOrgWide,
  isSubScope, }: Props) {
  const [qualifications, setQualifications] = useState<Qualification[]>([])
  const [loading,         setLoading]        = useState(true)
  const [statusFilter,    setStatusFilter]   = useState('')
  const [expanded,        setExpanded]       = useState<string | null>(null)
  const [actionLoading,   setActionLoading]  = useState<string | null>(null)
  const [showSignModal,   setShowSignModal]  = useState<Qualification | null>(null)
  const [showRejectModal, setShowRejectModal] = useState<Qualification | null>(null)
  const [justification,   setJustification]  = useState('')
  const [modalError,      setModalError]     = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
  }

  const fetchQualifications = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      ...(statusFilter ? { status: statusFilter }      : {}),
      ...(canManage    ? {}                            : { personId: currentUserId }),
    })
    const res  = await fetch(`/api/qualifications?${params}`)
    const data = await res.json()
    setQualifications(data.qualifications ?? [])
    setLoading(false)
  }, [statusFilter, canManage, currentUserId])

  useEffect(() => { fetchQualifications() }, [fetchQualifications])

  async function handleSign() {
    if (!showSignModal || justification.trim().length < 10) return
    setActionLoading(showSignModal.id)
    setModalError(null)

    const res  = await fetch(`/api/qualifications/${showSignModal.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'sign', justification }),
    })
    const data = await res.json()
    setActionLoading(null)

    if (!res.ok) {
      setModalError(data.message ?? 'Sign-off failed')
      return
    }

    setShowSignModal(null)
    setJustification('')
    showToast(data.fullyApproved ? '🏆 Qualification fully approved! Certificate generated.' : '✓ Step signed successfully')
    fetchQualifications()
  }

  async function handleReject() {
    if (!showRejectModal || justification.trim().length < 10) return
    setActionLoading(showRejectModal.id)
    setModalError(null)

    const res  = await fetch(`/api/qualifications/${showRejectModal.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'reject', justification }),
    })
    const data = await res.json()
    setActionLoading(null)

    if (!res.ok) {
      setModalError(data.message ?? 'Rejection failed')
      return
    }

    setShowRejectModal(null)
    setJustification('')
    showToast('Qualification rejected', 'error')
    fetchQualifications()
  }

  function openModal(type: 'sign' | 'reject', qual: Qualification) {
    setJustification('')
    setModalError(null)
    if (type === 'sign')   setShowSignModal(qual)
    if (type === 'reject') setShowRejectModal(qual)
  }

  return (
    <>
      {/* Filters */}
      <div
        className="bg-white rounded-xl border p-4 mb-4 flex flex-wrap gap-3"
        style={{ borderColor: '#e5e7eb' }}
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="">All statuses</option>
          <option value="INITIATED">Initiated</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="APPROVED">Approved</option>
          <option value="EXPIRED">Expired</option>
          <option value="REVOKED">Revoked</option>
        </select>

        <div className="ml-auto flex items-center gap-3">
          {isSubScope && (
            <span
              className="px-2 py-0.5 rounded text-xs font-semibold"
              style={{ background: '#eff6ff', color: '#1d4ed8' }}
            >
              Direct reports only
            </span>
          )}
          <span className="text-sm text-gray-400">
            {qualifications.length} record{qualifications.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading qualifications...
        </div>
      ) : qualifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <circle cx="12" cy="8" r="6"/>
            <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
          </svg>
          <p className="text-sm text-gray-400">No qualification records found</p>
          {canCreate && (
            <a
              href="/qualifications/new"
              className="text-sm font-medium"
              style={{ color: '#2d6a4f' }}
            >
              Create the first qualification →
            </a>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {qualifications.map((q) => {
            const isExpanded  = expanded === q.id
            const statusStyle = STATUS_STYLES[q.status] ?? STATUS_STYLES.IN_PROGRESS
            const nextStep    = q.signatories.find((s) => s.status === 'PENDING')

            return (
              <div
                key={q.id}
                className="bg-white rounded-xl border overflow-hidden"
                style={{
                  borderColor: q.status === 'EXPIRED' ? '#fecaca' : '#e5e7eb',
                }}
              >
                {/* Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {q.person.name}
                        </h3>
                        <span className="text-xs text-gray-400">
                          {q.person.employeeId}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={statusStyle}
                        >
                          {statusStyle.label}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 mb-1">
                        {q.technique.name}
                        <span
                          className="ml-2 px-1.5 py-0.5 rounded text-xs"
                          style={{ background: '#f5f3ff', color: '#6d28d9' }}
                        >
                          {q.technique.code}
                        </span>
                      </p>

                      <div className="text-xs text-gray-400">
                        Performed: {q.performedOn ? formatDate(q.performedOn) : '—'}
                        &nbsp;·&nbsp;
                        Supervised by: {q.supervisor?.name ?? '—'}
                        &nbsp;·&nbsp;
                        {q._count.scannedDocuments} document(s)
                        {q.expiryDate && (
                          <> &nbsp;·&nbsp; Expires: {formatDate(q.expiryDate)}</>
                        )}
                      </div>

                      {/* Certificate badge */}
                      {q.certificate && (
                        <div className="mt-2">
                          <span
                            className="text-xs px-2 py-1 rounded-full font-medium"
                            style={{ background: '#f0fdf4', color: '#166534' }}
                          >
                            🏆 {q.certificate.certNumber} · Issued {formatDate(q.certificate.issuedAt)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {canManage && nextStep && q.status !== 'REVOKED' && (
                        <button
                          onClick={() => openModal('sign', q)}
                          className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                          style={{ borderColor: '#bbf7d0', color: '#166534' }}
                        >
                          Sign step {nextStep.stepOrder}
                        </button>
                      )}

                      {canManage && q.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => openModal('reject', q)}
                          className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                          style={{ borderColor: '#fecaca', color: '#dc2626' }}
                        >
                          Reject
                        </button>
                      )}

                      <button
                        onClick={() => setExpanded(isExpanded ? null : q.id)}
                        className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                        style={{ borderColor: '#e5e7eb', color: '#374151' }}
                      >
                        {isExpanded ? 'Hide' : 'Details'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f3f4f6' }}>

                    {/* Signatory chain */}
                    <div className="px-5 py-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Signatory chain
                      </h4>
                      <div className="flex items-start gap-2 flex-wrap">
                        {q.signatories.map((s, idx) => (
                          <div key={s.id} className="flex items-center gap-2">
                            <div
                              className="px-3 py-2 rounded-lg border text-xs"
                              style={{
                                borderColor: s.status === 'SIGNED'   ? '#bbf7d0'
                                           : s.status === 'REJECTED' ? '#fecaca'
                                           : '#e5e7eb',
                                background:  s.status === 'SIGNED'   ? '#f0fdf4'
                                           : s.status === 'REJECTED' ? '#fef2f2'
                                           : '#fafafa',
                                color:       s.status === 'SIGNED'   ? '#166534'
                                           : s.status === 'REJECTED' ? '#dc2626'
                                           : '#6b7280',
                              }}
                            >
                              <div className="font-medium">
                                Step {s.stepOrder} — {s.requiredRole.replace(/_/g, ' ')}
                              </div>
                              <div className="mt-0.5">
                                {s.status === 'SIGNED'
                                  ? `✓ ${s.signedBy?.name} · ${formatDate(s.signedAt!)}`
                                  : s.status === 'REJECTED'
                                  ? '✗ Rejected'
                                  : '⏳ Pending'}
                              </div>
                              {s.justification && s.status === 'SIGNED' && (
                                <div
                                  className="mt-1 text-xs italic"
                                  style={{ color: '#4ade80', opacity: 0.8 }}
                                >
                                  "{s.justification}"
                                </div>
                              )}
                            </div>
                            {idx < q.signatories.length - 1 && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
                                <path d="M9 18l6-6-6-6"/>
                              </svg>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Evidence documents section */}
                    <div
                      className="px-5 pb-5"
                      style={{ borderTop: '1px solid #f3f4f6' }}
                    >
                      <DocumentSection
                        qualificationId={q.id}
                        canUpload={canManage && q.status === 'IN_PROGRESS'}
                        onUploadSuccess={() => {
                          showToast('Document uploaded successfully')
                          fetchQualifications()
                        }}
                        onUploadError={(msg) => showToast(msg, 'error')}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Sign modal */}
      {showSignModal && (
        <ActionModal
          title={`Sign off — ${showSignModal.person.name}`}
          description={`Confirm that ${showSignModal.person.name} has demonstrated competency on ${showSignModal.technique.name}.`}
          justification={justification}
          setJustification={setJustification}
          error={modalError}
          loading={actionLoading === showSignModal.id}
          onConfirm={handleSign}
          onCancel={() => { setShowSignModal(null); setModalError(null) }}
          confirmLabel="Sign off"
          confirmColor="#166534"
        />
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <ActionModal
          title={`Reject — ${showRejectModal.person.name}`}
          description="This will mark the analyst as Not Yet Competent and revoke the record."
          justification={justification}
          setJustification={setJustification}
          error={modalError}
          loading={actionLoading === showRejectModal.id}
          onConfirm={handleReject}
          onCancel={() => { setShowRejectModal(null); setModalError(null) }}
          confirmLabel="Reject"
          confirmColor="#dc2626"
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────
// Document Section — shows existing docs + upload form
// ─────────────────────────────────────────────────────────────────

function DocumentSection({
  qualificationId,
  canUpload,
  onUploadSuccess,
  onUploadError,
}: {
  qualificationId: string
  canUpload:       boolean
  onUploadSuccess: () => void
  onUploadError:   (msg: string) => void
}) {
  const [docs,        setDocs]        = useState<ScannedDoc[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [file,        setFile]        = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [uploading,   setUploading]   = useState(false)
  const [viewingUrl,  setViewingUrl]  = useState<string | null>(null)
  const [viewingName, setViewingName] = useState('')

  const fetchDocs = useCallback(async () => {
    setLoadingDocs(true)
    const res  = await fetch(`/api/qualifications/${qualificationId}/documents`)
    const data = await res.json()
    setDocs(data.documents ?? [])
    setLoadingDocs(false)
  }, [qualificationId])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  async function handleUpload() {
    if (!file || !description.trim()) {
      onUploadError('File and description are required')
      return
    }
    setUploading(true)

    const formData = new FormData()
    formData.append('file',        file)
    formData.append('description', description)

    const res  = await fetch(
      `/api/qualifications/${qualificationId}/documents`,
      { method: 'POST', body: formData }
    )
    const data = await res.json()
    setUploading(false)

    if (!res.ok) {
      onUploadError(data.message ?? 'Upload failed')
      return
    }

    setFile(null)
    setDescription('')

    // Reset file input
    const fileInput = document.getElementById(`file-input-${qualificationId}`) as HTMLInputElement
    if (fileInput) fileInput.value = ''

    await fetchDocs()
    onUploadSuccess()
  }

  async function handleView(docId: string, fileName: string) {
    const res  = await fetch(
      `/api/qualifications/${qualificationId}/documents/${docId}/url`
    )
    const data = await res.json()
    if (data.url) {
      setViewingUrl(data.url)
      setViewingName(fileName)
    }
  }

  const FILE_ICONS: Record<string, string> = {
    pdf:  '📄',
    jpg:  '🖼️',
    jpeg: '🖼️',
    png:  '🖼️',
  }

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Evidence documents
        {docs.length > 0 && (
          <span
            className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-normal normal-case"
            style={{ background: '#eff6ff', color: '#1d4ed8' }}
          >
            {docs.length} file{docs.length !== 1 ? 's' : ''}
          </span>
        )}
      </h4>

      {/* Document thumbnails/list */}
      {loadingDocs ? (
        <p className="text-xs text-gray-400 mb-3">Loading documents...</p>
      ) : docs.length === 0 ? (
        <p className="text-xs text-gray-400 mb-3">
          No evidence documents uploaded yet.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border group cursor-pointer hover:shadow-sm transition-shadow"
              style={{
                borderColor: '#e5e7eb',
                background:  '#fafafa',
                maxWidth:    '220px',
              }}
              onClick={() => handleView(doc.id, doc.fileName)}
              title={`Click to view — ${doc.description}`}
            >
              <span className="text-base flex-shrink-0">
                {FILE_ICONS[doc.fileType] ?? '📎'}
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className="text-xs font-medium text-gray-800 truncate"
                  title={doc.fileName}
                >
                  {doc.fileName}
                </div>
                <div className="text-xs text-gray-400 truncate" title={doc.description}>
                  {doc.description}
                </div>
                <div className="text-xs text-gray-300">
                  {formatDate(doc.uploadedAt)} · {doc.uploadedBy.name}
                </div>
              </div>
              <svg
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                width="12" height="12"
                viewBox="0 0 24 24" fill="none"
                stroke="#2d6a4f" strokeWidth="2"
              >
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </div>
          ))}
        </div>
      )}

      {/* Upload form */}
      {canUpload && (
        <div
          className="flex flex-col gap-2 p-3 rounded-lg border"
          style={{ borderColor: '#e5e7eb', background: '#fafafa' }}
        >
          <p className="text-xs font-medium text-gray-600">
            Upload evidence document
          </p>
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
              id={`file-input-${qualificationId}`}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-xs text-gray-500 flex-1"
            />
            <button
              onClick={handleUpload}
              disabled={uploading || !file || !description.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5 flex-shrink-0 disabled:opacity-40"
              style={{ background: '#2d6a4f' }}
            >
              {uploading ? (
                <>
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 00-9-9"/>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Accepted: PDF, JPG, PNG · Max 20MB
          </p>
          {file && (
            <div
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs"
              style={{ background: '#f0fdf4', color: '#166534' }}
            >
              <span>{FILE_ICONS[file.name.split('.').pop()?.toLowerCase() ?? ''] ?? '📎'}</span>
              <span className="font-medium">{file.name}</span>
              <span className="text-gray-400 ml-auto">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          )}
        </div>
      )}

      {/* Document viewer modal */}
      {viewingUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden shadow-2xl"
            style={{ width: '90vw', height: '85vh', maxWidth: '900px' }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: '#e5e7eb' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {viewingName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                  style={{ background: '#2d6a4f' }}
                >
                  Open in new tab ↗
                </a>
                <button
                  onClick={() => { setViewingUrl(null); setViewingName('') }}
                  className="px-3 py-1.5 rounded-lg text-xs border font-medium"
                  style={{ borderColor: '#e5e7eb', color: '#374151' }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Document preview */}
            <div className="w-full h-full">
              {viewingName.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={viewingUrl}
                  className="w-full"
                  style={{ height: 'calc(85vh - 52px)' }}
                  title={viewingName}
                />
              ) : (
                <div className="flex items-center justify-center h-full p-8">
                  <img
                    src={viewingUrl}
                    alt={viewingName}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Action modal ──────────────────────────────────────────────────

function ActionModal({
  title, description, justification, setJustification,
  error, loading, onConfirm, onCancel, confirmLabel, confirmColor,
}: {
  title:            string
  description:      string
  justification:    string
  setJustification: (v: string) => void
  error:            string | null
  loading:          boolean
  onConfirm:        () => void
  onCancel:         () => void
  confirmLabel:     string
  confirmColor:     string
}) {
  const isValid = justification.trim().length >= 10

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border"
        style={{ borderColor: '#e5e7eb' }}
      >
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: '#f3f4f6' }}>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Justification <span className="text-red-500">*</span>
          </label>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Minimum 10 characters..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none"
            style={{ borderColor: '#d1d5db' }}
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-1">
            {justification.trim().length} / min 10 characters
          </p>
          {error && (
            <p className="text-xs mt-2" style={{ color: '#dc2626' }}>{error}</p>
          )}
        </div>
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: '#f3f4f6' }}
        >
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm border font-medium"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!isValid || loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
            style={{ background: confirmColor }}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}