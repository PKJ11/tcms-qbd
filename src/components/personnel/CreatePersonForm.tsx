'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/permissions'
import type { AppRole } from '@/lib/types'

interface Section    { id: string; name: string; code: string }
interface Unit       { id: string; name: string; code: string; sections: Section[] }
interface Department { id: string; name: string; code: string; units: Unit[] }
interface Manager    { id: string; name: string; designation: string }

interface Props {
  departments: Department[]
}

type EmployeeType = 'QBD' | 'GUEST' | 'CONTRACTUAL'

const EMPLOYEE_TYPES: { value: EmployeeType; label: string }[] = [
  { value: 'QBD',          label: 'QBD Employee' },
  { value: 'GUEST',        label: 'Guest' },
  { value: 'CONTRACTUAL',  label: 'Contractual Employee' },
]

const QBD_ROLES: AppRole[]          = ['ADMINISTRATOR', 'VIEWER', 'TRAINER', 'TRAINEE']
const CONTRACTUAL_ROLES: AppRole[]  = ['TRAINER', 'TRAINEE']

export function CreatePersonForm({ departments }: Props) {
  const router = useRouter()

  const [employeeType, setEmployeeType] = useState<EmployeeType>('QBD')

  const [form, setForm] = useState({
    employeeId:   '',
    name:         '',
    email:        '',
    designation:  '',
    joiningDate:  '',
    departmentId: '',
    unitId:       '',
    sectionId:    '',
    managerId:    '',
  })

  const [roles, setRoles] = useState<AppRole[]>([])

  const [units,     setUnits]     = useState<Unit[]>([])
  const [sections,  setSections]  = useState<Section[]>([])
  const [managers,  setManagers]  = useState<Manager[]>([])
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  // Fetch a live preview of the next auto-assigned ID for Guest/Contractual types
  useEffect(() => {
    if (employeeType !== 'GUEST' && employeeType !== 'CONTRACTUAL') {
      setPreviewId(null)
      return
    }

    let cancelled = false
    setPreviewId(null)

    async function fetchPreview() {
      const res = await fetch(`/api/personnel/next-employee-id?type=${employeeType}`)
      if (!res.ok || cancelled) return
      const data = await res.json()
      if (!cancelled) setPreviewId(data.employeeId)
    }

    fetchPreview()
    return () => { cancelled = true }
  }, [employeeType])

  // Fetch potential managers when department changes (Administrator + Trainer only)
  useEffect(() => {
    if (!form.departmentId) {
      setManagers([])
      return
    }

    async function fetchManagers() {
      const params = new URLSearchParams({
        departmentId: form.departmentId,
        isActive:     'true',
      })
      const res  = await fetch(`/api/personnel?${params}`)
      const data = await res.json()

      const managerRoles: AppRole[] = ['ADMINISTRATOR', 'TRAINER']
      const filtered = (data.persons ?? []).filter(
        (p: { roles: AppRole[] }) => p.roles.some((r) => managerRoles.includes(r))
      )
      setManagers(filtered)
    }

    fetchManagers()
  }, [form.departmentId])

  function handleEmployeeTypeChange(type: EmployeeType) {
    setEmployeeType(type)
    setError(null)
    setForm((prev) => ({ ...prev, employeeId: '' }))
    if (type === 'GUEST') setRoles(['GUEST_TRAINER'])
    else setRoles([])
  }

  function toggleRole(role: AppRole) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleDepartmentChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const deptId = e.target.value
    const dept   = departments.find((d) => d.id === deptId)

    setForm((prev) => ({
      ...prev,
      departmentId: deptId,
      unitId:       '',
      sectionId:    '',
      managerId:    '',
    }))

    setUnits(dept?.units ?? [])
    setSections([])
  }

  function handleUnitChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const unitId = e.target.value
    const unit   = units.find((u) => u.id === unitId)

    setForm((prev) => ({ ...prev, unitId, sectionId: '' }))
    setSections(unit?.sections ?? [])
  }

  const availableRoles = useMemo(
    () => (employeeType === 'QBD' ? QBD_ROLES : employeeType === 'CONTRACTUAL' ? CONTRACTUAL_ROLES : []),
    [employeeType]
  )

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.name || !form.designation || !form.departmentId || !form.unitId) {
      setError('Please fill in all required fields.')
      return
    }

    if (employeeType === 'QBD' && !form.employeeId.trim()) {
      setError('Employee ID is required for QBD Employees.')
      return
    }

    if (employeeType === 'QBD' && !/^\d+$/.test(form.employeeId.trim())) {
      setError('QBD Employee ID must be numeric only.')
      return
    }

    if ((employeeType === 'QBD' || employeeType === 'CONTRACTUAL') && roles.length === 0) {
      setError('Select at least one role.')
      return
    }

    setModalOpen(true)
  }

  async function handleConfirm(justification: string, password?: string) {
    setModalOpen(false)
    setLoading(true)
    setError(null)

    const payload = {
      employeeType,
      employeeId:   employeeType === 'QBD' ? form.employeeId.trim() : undefined,
      name:         form.name,
      email:        form.email || undefined,
      designation:  form.designation,
      joiningDate:  form.joiningDate || undefined,
      departmentId: form.departmentId,
      unitId:       form.unitId,
      sectionId:    form.sectionId || undefined,
      managerId:    form.managerId || undefined,
      roles:        employeeType === 'GUEST' ? undefined : roles,
      justification,
      password,
    }

    const res = await fetch('/api/personnel', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.message ?? 'Failed to create person.')
      return
    }

    setSuccess(
      `Person created successfully — Employee ID: ${data.person.employeeId}.` +
      (form.email ? ' A temporary password has also been emailed.' : '')
    )
    setTempPassword(data.tempPassword ?? null)
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
  const inputStyle = { borderColor: '#d1d5db', background: '#fff' }
  const focusOn    = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    e.target.style.borderColor = '#2d6a4f'
  const focusOff   = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    e.target.style.borderColor = '#d1d5db'

  return (
    <>
      <div
        className="bg-white rounded-2xl border p-6"
        style={{ borderColor: '#e5e7eb' }}
      >
        {/* Employee type tabs */}
        <div className="flex gap-2 mb-6 border-b" style={{ borderColor: '#e5e7eb' }}>
          {EMPLOYEE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleEmployeeTypeChange(t.value)}
              className="px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px"
              style={{
                borderColor: employeeType === t.value ? '#2d6a4f' : 'transparent',
                color:       employeeType === t.value ? '#2d6a4f' : '#6b7280',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmitClick} className="flex flex-col gap-5">

          {/* Row 1 — Employee ID + Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Employee ID <span className="text-red-500">*</span>
              </label>
              {employeeType === 'QBD' ? (
                <input
                  name="employeeId"
                  value={form.employeeId}
                  onChange={handleChange}
                  placeholder="e.g. 1006"
                  inputMode="numeric"
                  className={inputClass}
                  style={inputStyle}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              ) : (
                <div
                  className="w-full px-4 py-2.5 rounded-lg border text-sm text-gray-500"
                  style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}
                >
                  Will be auto-assigned as{' '}
                  {previewId ?? (employeeType === 'GUEST' ? 'G-XXX' : 'CR-XXX')} on save
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Dr. John Smith"
                className={inputClass}
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              />
            </div>
          </div>

          {/* Row 2 — Email + Designation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="john@company.com"
                className={inputClass}
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Designation <span className="text-sm font-medium text-red-500">*</span>
              </label>
              <input
                name="designation"
                value={form.designation}
                onChange={handleChange}
                placeholder="Senior Analyst"
                className={inputClass}
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              />
            </div>
          </div>

          {/* Row 3 — Joining Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Joining Date
              </label>
              <input
                name="joiningDate"
                type="date"
                value={form.joiningDate}
                onChange={handleChange}
                className={inputClass}
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              />
            </div>
          </div>

          {/* Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Role(s) <span className="text-red-500">*</span>
            </label>

            {employeeType === 'GUEST' ? (
              <div
                className="px-4 py-3 rounded-lg border text-sm"
                style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}
              >
                <span className="font-medium" style={{ color: '#c2410c' }}>
                  {ROLE_LABELS.GUEST_TRAINER}
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {ROLE_DESCRIPTIONS.GUEST_TRAINER}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {availableRoles.map((role) => (
                  <label
                    key={role}
                    className="flex items-start gap-3 px-4 py-2.5 rounded-lg border cursor-pointer"
                    style={{
                      borderColor: roles.includes(role) ? '#2d6a4f' : '#e5e7eb',
                      background:  roles.includes(role) ? '#f0fdf4' : '#fff',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={roles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="w-4 h-4 mt-0.5 rounded border-gray-300 accent-green-700"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {ROLE_LABELS[role]}
                      </div>
                      <div className="text-xs text-gray-500">
                        {ROLE_DESCRIPTIONS[role]}
                      </div>
                    </div>
                  </label>
                ))}
                {employeeType === 'CONTRACTUAL' && (
                  <p className="text-xs text-gray-400 mt-1">
                    Also tagged as {ROLE_LABELS.CONTRACTUAL_EMPLOYEE} — {ROLE_DESCRIPTIONS.CONTRACTUAL_EMPLOYEE}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Department + Unit + Section */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                name="departmentId"
                value={form.departmentId}
                onChange={handleDepartmentChange}
                className={inputClass}
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                name="unitId"
                value={form.unitId}
                onChange={handleUnitChange}
                disabled={units.length === 0}
                className={inputClass}
                style={{
                  ...inputStyle,
                  opacity: units.length === 0 ? 0.5 : 1,
                  cursor:  units.length === 0 ? 'not-allowed' : 'auto',
                }}
                onFocus={focusOn}
                onBlur={focusOff}
              >
                <option value="">
                  {!form.departmentId ? 'Select a department first' : 'Select unit'}
                </option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Section
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <select
                name="sectionId"
                value={form.sectionId}
                onChange={handleChange}
                disabled={sections.length === 0}
                className={inputClass}
                style={{
                  ...inputStyle,
                  opacity: sections.length === 0 ? 0.5 : 1,
                  cursor:  sections.length === 0 ? 'not-allowed' : 'auto',
                }}
                onFocus={focusOn}
                onBlur={focusOff}
              >
                <option value="">
                  {!form.unitId
                    ? 'Select a unit first'
                    : sections.length === 0
                    ? 'This unit has no sections'
                    : 'No specific section'}
                </option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Manager */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Reporting Manager
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <select
              name="managerId"
              value={form.managerId}
              onChange={handleChange}
              disabled={!form.departmentId}
              className={inputClass}
              style={{
                ...inputStyle,
                opacity: form.departmentId ? 1 : 0.5,
                cursor:  form.departmentId ? 'auto' : 'not-allowed',
              }}
              onFocus={focusOn}
              onBlur={focusOff}
            >
              <option value="">
                {!form.departmentId
                  ? 'Select a department first'
                  : managers.length === 0
                  ? 'No managers available in this department'
                  : 'Select reporting manager'}
              </option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.designation}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Only active Administrators and Trainers are shown.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="text-sm px-4 py-3 rounded-lg border"
              style={{
                background:  '#fef2f2',
                borderColor: '#fecaca',
                color:       '#dc2626',
              }}
            >
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div
              className="text-sm px-4 py-3 rounded-lg border"
              style={{
                background:  '#f0fdf4',
                borderColor: '#bbf7d0',
                color:       '#166534',
              }}
            >
              {success}
            </div>
          )}

          {/* Temporary password — shown once, admin must copy it before leaving */}
          {tempPassword && (
            <div
              className="text-sm px-4 py-3 rounded-lg border font-mono"
              style={{
                background:  '#fefce8',
                borderColor: '#fde68a',
                color:       '#854d0e',
              }}
            >
              Temporary password: <strong>{tempPassword}</strong>
              <p className="text-xs mt-1" style={{ fontFamily: 'inherit' }}>
                Share this with the new user now — it will not be shown again.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {tempPassword ? (
              <button
                type="button"
                onClick={() => router.push('/personnel')}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: '#2d6a4f' }}
              >
                Go to personnel list
              </button>
            ) : (
              <>
                <a
                  href="/personnel"
                  className="px-4 py-2 rounded-lg text-sm border font-medium"
                  style={{ borderColor: '#e5e7eb', color: '#374151' }}
                >
                  Cancel
                </a>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: loading ? '#4a9e6f' : '#2d6a4f' }}
                >
                  {loading ? 'Creating...' : 'Create person'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      <JustificationModal
        isOpen={modalOpen}
        title="Confirm person creation"
        description={`Creating account for ${form.name || 'new person'}.${form.email ? ' A temporary password will be emailed.' : ''}`}
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        loading={loading}
        requirePassword
      />
    </>
  )
}
