'use client'

import { useState, useEffect } from 'react'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/permissions'
import type { AppRole } from '@/lib/types'

interface Section { id: string; name: string; code: string }
interface Unit    { id: string; name: string; code: string; sections: Section[] }
interface Department { id: string; name: string; code: string; units: Unit[] }

interface Member {
  id:         string
  employeeId: string
  name:       string
  roles:      AppRole[]
  isActive:   boolean
  department: { id: string; name: string } | null
  unit:       { id: string; name: string } | null
  section:    { id: string; name: string } | null
  manager:    { id: string; name: string } | null
}

type Selection = {
  scope: 'department' | 'unit' | 'section'
  id:    string
  path:  string
}

export function OrgStructureExplorer({ departments }: { departments: Department[] }) {
  const [selected, setSelected] = useState<Selection | null>(null)
  const [members,  setMembers]  = useState<Member[]>([])
  const [loading,  setLoading]  = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggle = (key: string) =>
    setExpanded((e) => ({ ...e, [key]: !e[key] }))

  useEffect(() => {
    if (!selected) { setMembers([]); return }
    const params = new URLSearchParams({ isActive: 'all' })
    if (selected.scope === 'department') params.set('departmentId', selected.id)
    if (selected.scope === 'unit')       params.set('unitId',       selected.id)
    if (selected.scope === 'section')    params.set('sectionId',    selected.id)

    let cancelled = false
    setLoading(true)
    fetch(`/api/personnel?${params}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setMembers(d.persons ?? []) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selected])

  const rowClass = (active: boolean) =>
    `w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
      active ? 'font-semibold' : 'hover:bg-gray-50'
    }`
  const rowStyle = (active: boolean) =>
    active ? { background: '#f0fdf4', color: '#2d6a4f' } : undefined

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* ── Tree ─────────────────────────────────────────── */}
      <div
        className="bg-white rounded-xl border p-3 h-fit"
        style={{ borderColor: '#e5e7eb' }}
      >
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-1">
          Structure
        </div>
        {departments.length === 0 && (
          <p className="text-sm text-gray-400 px-2 py-3">No departments defined.</p>
        )}
        <ul className="space-y-0.5">
          {departments.map((dept) => {
            const depKey = `d:${dept.id}`
            const depOpen = expanded[depKey] ?? true
            return (
              <li key={dept.id}>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggle(depKey)}
                    className="w-5 h-5 flex items-center justify-center text-gray-400 flex-shrink-0"
                    aria-label={depOpen ? 'Collapse' : 'Expand'}
                  >
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="3"
                      style={{ transform: depOpen ? 'rotate(90deg)' : 'none' }}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setSelected({ scope: 'department', id: dept.id, path: dept.name })}
                    className={rowClass(selected?.scope === 'department' && selected.id === dept.id)}
                    style={rowStyle(selected?.scope === 'department' && selected.id === dept.id)}
                  >
                    {dept.name}
                    <span className="text-gray-400 font-normal"> · {dept.code}</span>
                  </button>
                </div>

                {depOpen && (
                  <ul className="ml-6 space-y-0.5 border-l pl-2" style={{ borderColor: '#f3f4f6' }}>
                    {dept.units.length === 0 && (
                      <li className="text-xs text-gray-300 px-3 py-1">No units</li>
                    )}
                    {dept.units.map((unit) => {
                      const unitKey = `u:${unit.id}`
                      const unitOpen = expanded[unitKey] ?? false
                      const hasSections = unit.sections.length > 0
                      return (
                        <li key={unit.id}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => hasSections && toggle(unitKey)}
                              className="w-5 h-5 flex items-center justify-center text-gray-400 flex-shrink-0"
                              aria-label={unitOpen ? 'Collapse' : 'Expand'}
                              style={{ visibility: hasSections ? 'visible' : 'hidden' }}
                            >
                              <svg
                                width="12" height="12" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="3"
                                style={{ transform: unitOpen ? 'rotate(90deg)' : 'none' }}
                              >
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setSelected({ scope: 'unit', id: unit.id, path: `${dept.name} / ${unit.name}` })}
                              className={rowClass(selected?.scope === 'unit' && selected.id === unit.id)}
                              style={rowStyle(selected?.scope === 'unit' && selected.id === unit.id)}
                            >
                              {unit.name}
                              <span className="text-gray-400 font-normal"> · {unit.code}</span>
                            </button>
                          </div>

                          {unitOpen && hasSections && (
                            <ul className="ml-6 space-y-0.5 border-l pl-2" style={{ borderColor: '#f3f4f6' }}>
                              {unit.sections.map((section) => (
                                <li key={section.id}>
                                  <button
                                    onClick={() => setSelected({
                                      scope: 'section',
                                      id: section.id,
                                      path: `${dept.name} / ${unit.name} / ${section.name}`,
                                    })}
                                    className={rowClass(selected?.scope === 'section' && selected.id === section.id)}
                                    style={rowStyle(selected?.scope === 'section' && selected.id === section.id)}
                                  >
                                    {section.name}
                                    <span className="text-gray-400 font-normal"> · {section.code}</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* ── Members ──────────────────────────────────────── */}
      <div
        className="bg-white rounded-xl border overflow-hidden"
        style={{ borderColor: '#e5e7eb' }}
      >
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#e5e7eb' }}>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {selected ? selected.path : 'Members'}
            </div>
            <div className="text-xs text-gray-400">
              {selected
                ? `${members.length} member${members.length !== 1 ? 's' : ''}`
                : 'Select a department, unit or section on the left'}
            </div>
          </div>
        </div>

        {!selected ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            Nothing selected
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            Loading members…
          </div>
        ) : members.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            No members in this {selected.scope}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['SN.', 'EMP ID', 'Full Name', 'Role(s)', 'Dept / Unit / Section', 'Status', 'Manager'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m, idx) => (
                  <tr
                    key={m.id}
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{m.employeeId}</td>
                    <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{m.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.roles.length === 0 ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          m.roles.map((role) => (
                            <span
                              key={role}
                              className="px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{ background: ROLE_COLORS[role].bg, color: ROLE_COLORS[role].color }}
                            >
                              {ROLE_LABELS[role]}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      <div>{m.department?.name ?? '—'}</div>
                      <div className="text-gray-400">
                        {m.unit?.name ?? '—'}{m.section?.name ? ` / ${m.section.name}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={
                          m.isActive
                            ? { background: '#f0fdf4', color: '#166534' }
                            : { background: '#fef2f2', color: '#dc2626' }
                        }
                      >
                        {m.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {m.manager?.name ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
