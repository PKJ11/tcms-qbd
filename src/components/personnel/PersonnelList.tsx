'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/permissions'
import type { AppRole } from '@/lib/types'

interface Person {
  id:          string
  employeeId:  string
  name:        string
  email:       string
  roles:       AppRole[]
  designation: string
  isActive:    boolean
  joiningDate: string | null
  lastLoginAt: string | null
  createdAt:   string | null
  createdBy:   { id: string; name: string } | null
  department:  { id: string; name: string } | null
  unit:        { id: string; name: string } | null
  section:     { id: string; name: string } | null
  manager:     { id: string; name: string } | null
}

const ALL_ROLES: AppRole[] = [
  'ADMINISTRATOR', 'VIEWER', 'TRAINER', 'TRAINEE', 'GUEST_TRAINER', 'CONTRACTUAL_EMPLOYEE',
]

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'true' | 'false'>('all')

  const fetchPersons = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      isActive: statusFilter,
      ...(search     ? { search }     : {}),
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(sectionId  ? { sectionId }  : {}),
    })
    const res  = await fetch(`/api/personnel?${params}`)
    const data = await res.json()
    setPersons(data.persons ?? [])
    setLoading(false)
  }, [search, roleFilter, statusFilter, sectionId])

  useEffect(() => { fetchPersons() }, [fetchPersons])

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
          {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'true' | 'false')}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="all">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Disabled</option>
        </select>

        <div className="ml-auto text-sm text-gray-400 self-center">
          {persons.length} user{persons.length !== 1 ? 's' : ''}
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
                Create the first user →
              </a>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['', 'SN.', 'EMP ID', 'Full Name', 'Dept', 'Unit', 'Status', 'Created By', 'Created On'].map((h, i) => (
                  <th
                    key={i}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {persons.map((p, idx) => (
                <tr
                  key={p.id}
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Edit — opens the person page where every field is editable */}
                  <td className="px-4 py-3">
                    <a
                      href={`/personnel/${p.id}`}
                      title="Edit details"
                      aria-label={`Edit ${p.name}`}
                      className="inline-flex items-center justify-center w-7 h-7 rounded text-white"
                      style={{ background: '#2d6a4f' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </a>
                  </td>

                  {/* SN. */}
                  <td className="px-4 py-3 text-gray-500">{idx + 1}</td>

                  {/* EMP ID */}
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{p.employeeId}</td>

                  {/* Full Name */}
                  <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{p.name}</td>

                  {/* Dept */}
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.department?.name ?? '—'}</td>

                  {/* Unit */}
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {p.unit?.name ?? '—'}{p.section?.name ? ` / ${p.section.name}` : ''}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={
                        p.isActive
                          ? { background: '#f0fdf4', color: '#166534' }
                          : { background: '#fef2f2', color: '#dc2626' }
                      }
                    >
                      {p.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>

                  {/* Created By */}
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {p.createdBy?.name ?? '—'}
                  </td>

                  {/* Created On */}
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {p.createdAt ? formatDate(p.createdAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </>
  )
}