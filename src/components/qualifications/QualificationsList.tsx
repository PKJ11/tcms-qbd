'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { OrgFilterBar, EMPTY_ORG_FILTER, orgFilterParams, type OrgFilterValue } from '@/components/shared/OrgFilterBar'

interface Signatory {
  id:           string
  stepOrder:    number
  requiredRole: string
  status:       string
  assignedTo:   { id: string; name: string } | null
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

type Scope = 'relevant' | 'mine' | 'created' | 'supervised' | 'reportees' | 'team' | 'all' | 'pendingSignoff'

const SCOPE_TABS: { key: Scope; label: string; description: string }[] = [
  { key: 'relevant',   label: 'Relevant to me', description: 'About me, created by me, or supervised by me' },
  { key: 'pendingSignoff', label: 'Pending my sign-off', description: 'Qualifications where I am the assigned approver for the next step' },
  { key: 'mine',       label: 'Mine',           description: 'Records where I am the analyst being qualified' },
  { key: 'created',    label: 'Created by me',  description: 'Records I initiated' },
  { key: 'supervised', label: 'Supervised by me', description: 'Records where I am the supervisor' },
  { key: 'reportees',  label: 'My reportees',   description: 'My direct reports only' },
  { key: 'team',       label: 'My team',        description: 'My direct reports, and their reports, all the way down' },
  { key: 'all',        label: 'All',            description: 'Every qualification record, org-wide' },
]

interface Props {
  canCreate: boolean
}

export function QualificationsList({ canCreate }: Props) {
  const router = useRouter()
  const [qualifications, setQualifications] = useState<Qualification[]>([])
  const [loading,      setLoading]      = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [fromDate,     setFromDate]     = useState('')
  const [toDate,       setToDate]       = useState('')
  const [scope,        setScope]        = useState<Scope>('relevant')
  const [orgFilter,    setOrgFilter]    = useState<OrgFilterValue>(EMPTY_ORG_FILTER)

  function handleScopeChange(next: Scope) {
    setScope(next)
    if (next !== 'all') setOrgFilter(EMPTY_ORG_FILTER)
  }

  const fetchQualifications = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      scope,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(fromDate ? { fromDate } : {}),
      ...(toDate   ? { toDate }   : {}),
      ...(scope === 'all' ? orgFilterParams(orgFilter) : {}),
    })
    const res  = await fetch(`/api/qualifications?${params}`)
    const data = await res.json()
    setQualifications(data.qualifications ?? [])
    setLoading(false)
  }, [statusFilter, fromDate, toDate, scope, orgFilter])

  useEffect(() => { fetchQualifications() }, [fetchQualifications])

  return (
    <>
      {/* Scope selector */}
      <div
        className="flex flex-wrap gap-1 mb-3 bg-white rounded-xl border p-1"
        style={{ borderColor: '#e5e7eb' }}
      >
        {SCOPE_TABS.map((s) => (
          <button
            key={s.key}
            onClick={() => handleScopeChange(s.key)}
            title={s.description}
            className="py-2 px-3 rounded-lg text-sm font-medium transition-all"
            style={{
              background: scope === s.key ? '#1d4ed8' : 'transparent',
              color:      scope === s.key ? '#fff'    : '#6b7280',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Department → Unit → Section filter — "All" scope only */}
      {scope === 'all' && (
        <OrgFilterBar value={orgFilter} onChange={setOrgFilter} />
      )}

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

        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          title="From date"
          max={toDate || undefined}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          title="To date"
          min={fromDate || undefined}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        />

        <div className="ml-auto flex items-center gap-3">
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
            const statusStyle = STATUS_STYLES[q.status] ?? STATUS_STYLES.IN_PROGRESS
            const nextStep    = q.signatories.find((s) => s.status === 'PENDING')

            return (
              <div
                key={q.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/qualifications/${q.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/qualifications/${q.id}`) }}
                className="bg-white rounded-xl border p-5 cursor-pointer hover:shadow-sm transition-shadow"
                style={{
                  borderColor: q.status === 'EXPIRED' ? '#fecaca' : '#e5e7eb',
                }}
              >
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
                      Created by: {q.initiatedBy.name}
                      &nbsp;·&nbsp;
                      Supervised by: {q.supervisor?.name ?? '—'}
                      &nbsp;·&nbsp;
                      {q._count.scannedDocuments} document(s)
                      {nextStep && q.status === 'IN_PROGRESS' && (
                        <>
                          &nbsp;·&nbsp; Awaiting step {nextStep.stepOrder === 1 ? 'QC sign-off' : 'QA final approval'}
                          {nextStep.assignedTo && <> (assigned to {nextStep.assignedTo.name})</>}
                        </>
                      )}
                    </div>

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

                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/qualifications/${q.id}`) }}
                    className="px-3 py-1.5 rounded-lg border text-xs font-medium flex-shrink-0"
                    style={{ borderColor: '#e5e7eb', color: '#374151' }}
                  >
                    Open →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
