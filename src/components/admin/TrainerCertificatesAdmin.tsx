'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'
import { JustificationModal } from '@/components/JustificationModal'

interface Person {
  id:          string
  name:        string
  employeeId:  string
  designation: string
  role:        string
  department:  { name: string } | null
  trainerCertificates: { id: string; certNumber: string }[]
}

interface Certificate {
  id:           string
  certNumber:   string
  basis:        string
  isActive:     boolean
  issuedAt:     string
  revokedAt:    string | null
  revokedReason: string | null
  person:   { id: string; name: string; employeeId: string; designation: string }
  issuedBy: { id: string; name: string }
  revokedBy: { id: string; name: string } | null
}

export function TrainerCertificatesAdmin() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [eligible,     setEligible]     = useState<Person[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [form, setForm] = useState({ personId: '', basis: '' })
  const [issueModal,  setIssueModal]   = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<Certificate | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [error,          setError]        = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/trainer-certificates')
    const data = await res.json()
    setCertificates(data.certificates ?? [])
    setEligible(data.eligible ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleIssue(justification: string) {
    setIssueModal(false)
    setActionLoading(true)
    setError(null)

    const res  = await fetch('/api/trainer-certificates', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...form, justification }),
    })
    const data = await res.json()
    setActionLoading(false)

    if (!res.ok) {
      setError(data.message ?? 'Failed to issue certificate')
      return
    }

    setShowForm(false)
    setForm({ personId: '', basis: '' })
    fetchData()
  }

  async function handleRevoke(justification: string) {
    if (!revokeTarget) return
    setActionLoading(true)

    const res = await fetch(`/api/trainer-certificates/${revokeTarget.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ justification, reason: revokeReason }),
    })

    setActionLoading(false)
    setRevokeTarget(null)
    setRevokeReason('')

    if (res.ok) fetchData()
  }

  const activeCerts   = certificates.filter((c) => c.isActive)
  const revokedCerts  = certificates.filter((c) => !c.isActive)
  const alreadyCertified = new Set(activeCerts.map((c) => c.person.id))

  return (
    <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e5e7eb' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Trainer Certificates
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Per SOP QbD-QA-SOP-007 Annexure I — issued by Head QA / Designee.
            Format: QbD/QA/F/007-07
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#2d6a4f' }}
        >
          {showForm ? 'Cancel' : '+ Issue certificate'}
        </button>
      </div>

      {/* Issue form */}
      {showForm && (
        <div
          className="mb-5 p-4 rounded-xl border flex flex-col gap-3"
          style={{ background: '#fafafa', borderColor: '#e5e7eb' }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Person <span className="text-red-500">*</span>
            </label>
            <select
              value={form.personId}
              onChange={(e) => setForm({ ...form, personId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: '#d1d5db' }}
            >
              <option value="">Select person to certify as Trainer</option>
              {eligible
                .filter((p) => !alreadyCertified.has(p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.employeeId} · {p.designation}
                    {p.department ? ` · ${p.department.name}` : ''}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Basis for certification <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.basis}
              onChange={(e) => setForm({ ...form, basis: e.target.value })}
              placeholder="e.g. 5+ years industry experience in HPLC and GC techniques, has conducted 12 training sessions..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none"
              style={{ borderColor: '#d1d5db' }}
            />
            <p className="text-xs text-gray-400 mt-1">
              Per SOP: Internal trainer identified based on qualification, communication,
              presentation skill, experience, and expertise.
            </p>
          </div>

          {error && (
            <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>
          )}

          <button
            onClick={() => {
              if (!form.personId || !form.basis.trim()) {
                setError('Person and basis are required')
                return
              }
              setError(null)
              setIssueModal(true)
            }}
            disabled={actionLoading}
            className="self-end px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: '#2d6a4f' }}
          >
            {actionLoading ? 'Issuing...' : 'Issue certificate'}
          </button>
        </div>
      )}

      {/* Active certificates */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : activeCerts.length === 0 ? (
        <p className="text-sm text-gray-400 mb-4">No active trainer certificates.</p>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {activeCerts.map((cert) => (
            <div
              key={cert.id}
              className="flex items-center justify-between p-3 rounded-lg border"
              style={{ borderColor: '#e5e7eb', background: '#fafafa' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: '#f0fdf4', color: '#2d6a4f' }}
                >
                  {cert.person.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {cert.person.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {cert.certNumber} · Issued {formatDate(cert.issuedAt)} by {cert.issuedBy.name}
                  </div>
                  <div className="text-xs text-gray-400 italic mt-0.5">
                    {cert.basis}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setRevokeTarget(cert)}
                className="px-2 py-1 rounded border text-xs"
                style={{ borderColor: '#fecaca', color: '#dc2626' }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Revoked certificates — collapsed */}
      {revokedCerts.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-gray-400 cursor-pointer">
            {revokedCerts.length} revoked certificate(s)
          </summary>
          <div className="flex flex-col gap-2 mt-2">
            {revokedCerts.map((cert) => (
              <div
                key={cert.id}
                className="p-3 rounded-lg border text-xs text-gray-400"
                style={{ borderColor: '#f3f4f6' }}
              >
                {cert.certNumber} · {cert.person.name} ·
                Revoked {cert.revokedAt ? formatDate(cert.revokedAt) : '—'}
                {cert.revokedReason && ` — ${cert.revokedReason}`}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Issue modal */}
      <JustificationModal
        isOpen={issueModal}
        title="Confirm Trainer Certificate issuance"
        description={`Issuing TR-CERT to ${eligible.find((p) => p.id === form.personId)?.name ?? ''}. This is a formal certification per SOP QbD-QA-SOP-007 Annexure I.`}
        onConfirm={handleIssue}
        onCancel={() => setIssueModal(false)}
        loading={actionLoading}
      />

      {/* Revoke modal */}
      {revokeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border p-6" style={{ borderColor: '#e5e7eb' }}>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Revoke Trainer Certificate
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {revokeTarget.certNumber} · {revokeTarget.person.name}
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Reason for revocation <span className="text-red-500">*</span>
            </label>
            <textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Why is this trainer certificate being revoked?"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none mb-4"
              style={{ borderColor: '#d1d5db' }}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setRevokeTarget(null); setRevokeReason('') }}
                className="px-4 py-2 rounded-lg text-sm border font-medium"
                style={{ borderColor: '#e5e7eb', color: '#374151' }}
              >
                Cancel
              </button>
              <JustificationModal
                isOpen={revokeReason.trim().length >= 5}
                title="Confirm revocation"
                description={`Revoking trainer certificate for ${revokeTarget.person.name}. This is permanent and will be logged.`}
                onConfirm={handleRevoke}
                onCancel={() => { setRevokeTarget(null); setRevokeReason('') }}
                loading={actionLoading}
              />
              <button
                onClick={() => {
                  if (revokeReason.trim().length < 5) return
                }}
                disabled={revokeReason.trim().length < 5}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{ background: '#dc2626' }}
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}