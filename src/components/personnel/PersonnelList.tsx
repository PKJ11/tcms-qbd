'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'
import { JustificationModal } from '@/components/JustificationModal'

interface Person {
  id:          string
  employeeId:  string
  name:        string
  email:       string
  role:        string
  designation: string
  isActive:    boolean
  joiningDate: string
  lastLoginAt: string | null
  department:  { id: string; name: string } | null
  section:     { id: string; name: string } | null
  manager:     { id: string; name: string } | null
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  USER:          { bg: '#f0fdf4', color: '#166534' },
  MANAGER:       { bg: '#eff6ff', color: '#1d4ed8' },
  TRAINER:       { bg: '#f5f3ff', color: '#6d28d9' },
  TRAINING_HEAD: { bg: '#fff7ed', color: '#c2410c' },
  ADMINISTRATOR:   { bg: '#fef2f2', color: '#dc2626' },
  MD:            { bg: '#fefce8', color: '#854d0e' },
}

export function PersonnelList({
  canCreate,
  sectionId,
}: {
  canCreate: boolean
  sectionId?: string
}) {
  const [persons,  setPersons]  = useState<Person[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Deactivate modal state
  const [deactivateTarget, setDeactivateTarget] = useState<Person | null>(null)
  const [modalLoading,     setModalLoading]     = useState(false)

  const fetchPersons = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      isActive: showInactive ? 'false' : 'true',
      ...(search     ? { search }     : {}),
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(sectionId  ? { sectionId }  : {}),
    })
    const res  = await fetch(`/api/personnel?${params}`)
    const data = await res.json()
    setPersons(data.persons ?? [])
    setLoading(false)
  }, [search, roleFilter, showInactive, sectionId])

  useEffect(() => { fetchPersons() }, [fetchPersons])

  async function handleDeactivate(justification: string) {
    if (!deactivateTarget) return
    setModalLoading(true)

    const res = await fetch(`/api/personnel/${deactivateTarget.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        action: 'deactivate',
        justification,
      }),
    })

    setModalLoading(false)
    setDeactivateTarget(null)

    if (res.ok) fetchPersons()
  }

  return (
    <>
      {/* Filters */}
      <div
        className="bg-white rounded-xl border p-4 mb-4 flex flex-wrap gap-3"
        style={{ borderColor: '#e5e7eb' }}
      >
        {/* Search */}
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
            placeholder="Search name, email, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: '#e5e7eb' }}
          />
        </div>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="">All roles</option>
          {['USER','MANAGER','TRAINER','TRAINING_HEAD','ADMINISTRATOR','REVIEWER']
            .map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>

        {/* Active toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 accent-green-700"
          />
          Show inactive
        </label>

        <div className="ml-auto text-sm text-gray-400 self-center">
          {persons.length} {showInactive ? 'inactive' : 'active'} person{persons.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div
        className="bg-white rounded-xl border overflow-hidden"
        style={{ borderColor: '#e5e7eb' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            Loading personnel...
          </div>
        ) : persons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <p className="text-sm text-gray-400">No personnel found</p>
            {canCreate && (
              <a
                href="/personnel/new"
                className="text-sm font-medium"
                style={{ color: '#2d6a4f' }}
              >
                Add the first person →
              </a>
            )}
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Employee','Email','Role','Department / Section','Joined','Last login',''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {persons.map((p) => {
                const roleStyle = ROLE_COLORS[p.role] ?? { bg: '#f9fafb', color: '#374151' }
                return (
                  <tr
                    key={p.id}
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Employee */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                          style={{ background: '#f0fdf4', color: '#2d6a4f' }}
                        >
                          {p.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {p.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {p.employeeId}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {p.email}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={roleStyle}
                      >
                        {p.role.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Department / Section */}
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div>{p.department?.name ?? '—'}</div>
                      <div className="text-gray-400">
                        {p.section?.name ?? '—'}
                      </div>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(p.joiningDate)}
                    </td>

                    {/* Last login */}
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {p.lastLoginAt ? formatDate(p.lastLoginAt) : '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/personnel/${p.id}`}
                          className="text-xs px-2 py-1 rounded border transition-colors"
                          style={{ borderColor: '#e5e7eb', color: '#374151' }}
                        >
                          View
                        </a>
                        {canCreate && p.isActive && (
                          <button
                            onClick={() => setDeactivateTarget(p)}
                            className="text-xs px-2 py-1 rounded border transition-colors"
                            style={{ borderColor: '#fecaca', color: '#dc2626' }}
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Deactivate confirmation modal */}
      <JustificationModal
        isOpen={!!deactivateTarget}
        title={`Deactivate ${deactivateTarget?.name ?? ''}`}
        description="This person will lose access to TCMS. Their records are retained. Enter a reason."
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
        loading={modalLoading}
      />
    </>
  )
}