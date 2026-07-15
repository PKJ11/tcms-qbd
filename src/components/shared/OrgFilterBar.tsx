'use client'

import { useState, useEffect } from 'react'

interface Section    { id: string; name: string }
interface Unit       { id: string; name: string; sections: Section[] }
interface Department { id: string; name: string; units: Unit[] }

export interface OrgFilterValue {
  departmentId: string
  unitId:       string
  sectionId:    string
}

export const EMPTY_ORG_FILTER: OrgFilterValue = { departmentId: '', unitId: '', sectionId: '' }

// Only non-empty levels are included, so callers can spread this straight
// into a URLSearchParams init object without leaking empty-string params.
export function orgFilterParams(value: OrgFilterValue): Record<string, string> {
  return {
    ...(value.departmentId && { departmentId: value.departmentId }),
    ...(value.unitId       && { unitId:       value.unitId       }),
    ...(value.sectionId    && { sectionId:    value.sectionId    }),
  }
}

interface Props {
  value:    OrgFilterValue
  onChange: (value: OrgFilterValue) => void
}

const selectClass = "px-3 py-2 rounded-lg border text-sm outline-none disabled:opacity-40 disabled:bg-gray-50"
const selectStyle = { borderColor: '#e5e7eb' }

export function OrgFilterBar({ value, onChange }: Props) {
  const [departments, setDepartments] = useState<Department[]>([])

  useEffect(() => {
    fetch('/api/departments')
      .then((res) => res.json())
      .then((data) => setDepartments(data.departments ?? []))
  }, [])

  const department = departments.find((d) => d.id === value.departmentId)
  const units       = department?.units ?? []
  const unit        = units.find((u) => u.id === value.unitId)
  const sections    = unit?.sections ?? []

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      <select
        value={value.departmentId}
        onChange={(e) => onChange({ departmentId: e.target.value, unitId: '', sectionId: '' })}
        className={selectClass}
        style={selectStyle}
      >
        <option value="">All departments</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>

      <select
        value={value.unitId}
        onChange={(e) => onChange({ ...value, unitId: e.target.value, sectionId: '' })}
        disabled={!value.departmentId}
        className={selectClass}
        style={selectStyle}
      >
        <option value="">All units</option>
        {units.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>

      <select
        value={value.sectionId}
        onChange={(e) => onChange({ ...value, sectionId: e.target.value })}
        disabled={!value.unitId}
        className={selectClass}
        style={selectStyle}
      >
        <option value="">All sections</option>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  )
}
