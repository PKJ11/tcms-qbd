'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'
import { JustificationModal } from '@/components/JustificationModal'

interface Version {
  id:            string
  versionLabel:  string
  versionType:   string
  status:        string
  effectiveDate: string
  uploadedBy:    { id: string; name: string }
  approvedBy:    { id: string; name: string } | null
}

interface Material {
  id:             string
  title:          string
  currentVersion: number
  status:         string
  updatedAt:      string
  topic:          { id: string; name: string }
  versions:       Version[]
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT:    { bg: '#fefce8', color: '#854d0e' },
  APPROVED: { bg: '#f0fdf4', color: '#166534' },
  RETIRED:  { bg: '#f9fafb', color: '#6b7280' },
}

const VERSION_COLORS: Record<string, { bg: string; color: string }> = {
  MAJOR: { bg: '#fef2f2', color: '#dc2626' },
  MINOR: { bg: '#eff6ff', color: '#1d4ed8' },
}

export function ContentList({ canUpload }: { canUpload: boolean }) {
  const [materials,     setMaterials]     = useState<Material[]>([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState('')
  const [expanded,      setExpanded]      = useState<string | null>(null)
  const [retireTarget,  setRetireTarget]  = useState<Material | null>(null)
  const [approveTarget, setApproveTarget] = useState<Version  | null>(null)
  const [modalLoading,  setModalLoading]  = useState(false)

  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      ...(search       ? { search }           : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    })
    const res  = await fetch(`/api/content?${params}`)
    const data = await res.json()
    setMaterials(data.materials ?? [])
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => { fetchMaterials() }, [fetchMaterials])

  async function handleRetire(justification: string) {
    if (!retireTarget) return
    setModalLoading(true)

    await fetch(`/api/content/${retireTarget.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'retire', justification }),
    })

    setModalLoading(false)
    setRetireTarget(null)
    fetchMaterials()
  }

  async function handleApprove(justification: string) {
    if (!approveTarget) return
    setModalLoading(true)

    // Find the material for this version
    const material = materials.find((m) =>
      m.versions.some((v) => v.id === approveTarget.id)
    )
    if (!material) return

    await fetch(
      `/api/content/${material.id}/versions/${approveTarget.id}/approve`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ justification }),
      }
    )

    setModalLoading(false)
    setApproveTarget(null)
    fetchMaterials()
  }

  async function handleView(materialId: string, versionId: string) {
    const res  = await fetch(
      `/api/content/${materialId}/versions/${versionId}/view`
    )
    const data = await res.json()
    if (data.url) window.open(data.url, '_blank')
  }

  return (
    <>
      {/* Filters */}
      <div
        className="bg-white rounded-xl border p-4 mb-4 flex flex-wrap gap-3"
        style={{ borderColor: '#e5e7eb' }}
      >
        <div className="relative flex-1 min-w-48">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            width="15" height="15"
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: '#e5e7eb' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="APPROVED">Approved</option>
          <option value="RETIRED">Retired</option>
        </select>

        <div className="ml-auto text-sm text-gray-400 self-center">
          {materials.length} material{materials.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Materials list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading materials...
        </div>
      ) : materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p className="text-sm text-gray-400">No materials uploaded yet</p>
          {canUpload && (
            <a
              href="/content/upload"
              className="text-sm font-medium"
              style={{ color: '#2d6a4f' }}
            >
              Upload the first material →
            </a>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {materials.map((material) => {
            const isExpanded   = expanded === material.id
            const latestVersion = material.versions[0]
            const statusStyle  = STATUS_COLORS[material.status] ?? STATUS_COLORS.DRAFT

            return (
              <div
                key={material.id}
                className="bg-white rounded-xl border overflow-hidden"
                style={{ borderColor: '#e5e7eb' }}
              >
                {/* Material header */}
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4 flex-1">
                    {/* File icon */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: '#f0fdf4' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {material.title}
                        </h3>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={statusStyle}
                        >
                          {material.status}
                        </span>
                        {latestVersion && (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: '#f5f3ff', color: '#6d28d9' }}
                          >
                            v{latestVersion.versionLabel}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {material.topic.name} &nbsp;·&nbsp;
                        {material.versions.length} version{material.versions.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
                        Updated {formatDate(material.updatedAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View latest approved */}
                    {latestVersion?.status === 'APPROVED' && (
                      <button
                        onClick={() => handleView(material.id, latestVersion.id)}
                        className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                        style={{ borderColor: '#e5e7eb', color: '#374151' }}
                      >
                        View
                      </button>
                    )}

                    {/* Retire */}
                    {canUpload && material.status !== 'RETIRED' && (
                      <button
                        onClick={() => setRetireTarget(material)}
                        className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                        style={{ borderColor: '#fecaca', color: '#dc2626' }}
                      >
                        Retire
                      </button>
                    )}

                    {/* Expand versions */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : material.id)}
                      className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                      style={{ borderColor: '#e5e7eb', color: '#374151' }}
                    >
                      {isExpanded ? 'Hide versions' : 'Version history'}
                    </button>
                  </div>
                </div>

                {/* Version history */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f3f4f6' }}>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr style={{ background: '#f9fafb' }}>
                          {['Version','Type','Status','Effective date','Uploaded by','Approved by','Change summary',''].map((h) => (
                            <th
                              key={h}
                              className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {material.versions.map((version) => {
                          const vStyle = VERSION_COLORS[version.versionType] ?? VERSION_COLORS.MINOR
                          const sStyle = STATUS_COLORS[version.status]       ?? STATUS_COLORS.DRAFT

                          return (
                            <tr
                              key={version.id}
                              style={{ borderTop: '1px solid #f3f4f6' }}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-4 py-3 font-mono font-semibold text-gray-700">
                                v{version.versionLabel}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                  style={vStyle}
                                >
                                  {version.versionType}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                  style={sStyle}
                                >
                                  {version.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-500">
                                {formatDate(version.effectiveDate)}
                              </td>
                              <td className="px-4 py-3 text-gray-500">
                                {version.uploadedBy.name}
                              </td>
                              <td className="px-4 py-3 text-gray-500">
                                {version.approvedBy?.name ?? '—'}
                              </td>
                              <td className="px-4 py-3 text-gray-500 max-w-xs">
                                —
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleView(material.id, version.id)}
                                    className="px-2 py-1 rounded border text-xs"
                                    style={{ borderColor: '#e5e7eb', color: '#374151' }}
                                  >
                                    View
                                  </button>
                                  {canUpload && version.status === 'DRAFT' && (
                                    <button
                                      onClick={() => setApproveTarget(version)}
                                      className="px-2 py-1 rounded border text-xs"
                                      style={{ borderColor: '#bbf7d0', color: '#166534' }}
                                    >
                                      Approve
                                    </button>
                                  )}
                                </div>
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
          })}
        </div>
      )}

      {/* Retire modal */}
      <JustificationModal
        isOpen={!!retireTarget}
        title={`Retire "${retireTarget?.title ?? ''}"`}
        description="This material will be retired and no longer available for new assignments."
        onConfirm={handleRetire}
        onCancel={() => setRetireTarget(null)}
        loading={modalLoading}
      />

      {/* Approve modal */}
      <JustificationModal
        isOpen={!!approveTarget}
        title={`Approve version v${approveTarget?.versionLabel ?? ''}`}
        description="Approving this version makes it available for training. A major version triggers retraining for previously trained personnel."
        onConfirm={handleApprove}
        onCancel={() => setApproveTarget(null)}
        loading={modalLoading}
      />
    </>
  )
}