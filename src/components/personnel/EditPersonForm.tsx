'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/permissions'
import type { AppRole } from '@/lib/types'

interface Section    { id: string; name: string; code: string }
interface Unit       { id: string; name: string; code: string; sections: Section[] }
interface Department { id: string; name: string; code: string; units: Unit[] }
interface Manager    { id: string; name: string; designation: string }

interface Person {
  id:           string
  roles:        AppRole[]
  departmentId: string
  unitId:       string
  sectionId:    string
  managerId:    string
}

interface Props {
  person:      Person
  departments: Department[]
}

const QBD_ROLES: AppRole[]         = ['ADMINISTRATOR', 'VIEWER', 'TRAINER', 'TRAINEE']
const CONTRACTUAL_ROLES: AppRole[] = ['TRAINER', 'TRAINEE']

export function EditPersonForm({ person, departments }: Props) {
  const router = useRouter()

  const employeeType: 'QBD' | 'GUEST' | 'CONTRACTUAL' = person.roles.includes('GUEST_TRAINER')
    ? 'GUEST'
    : person.roles.includes('CONTRACTUAL_EMPLOYEE')
    ? 'CONTRACTUAL'
    : 'QBD'

  const editableInitialRoles = person.roles.filter(
    (r) => r !== 'GUEST_TRAINER' && r !== 'CONTRACTUAL_EMPLOYEE'
  )

  const [roles, setRoles] = useState<AppRole[]>(editableInitialRoles)
  const [departmentId, setDepartmentId] = useState(person.departmentId)
  const [unitId,       setUnitId]       = useState(person.unitId)
  const [sectionId,    setSectionId]    = useState(person.sectionId)
  const [managerId,    setManagerId]    = useState(person.managerId)

  const [units,    setUnits]    = useState<Unit[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [managers, setManagers] = useState<Manager[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)

  // Initialise unit/section pickers from the person's current department/unit
  useEffect(() => {
    const dept = departments.find((d) => d.id === departmentId)
    setUnits(dept?.units ?? [])
  }, [departmentId, departments])

  useEffect(() => {
    const dept = departments.find((d) => d.id === departmentId)
    const unit = dept?.units.find((u) => u.id === unitId)
    setSections(unit?.sections ?? [])
  }, [unitId, departmentId, departments])

  // Fetch potential managers for the currently selected department
  useEffect(() => {
    if (!departmentId) {
      setManagers([])
      return
    }

    async function fetchManagers() {
      const params = new URLSearchParams({ departmentId, isActive: 'true' })
      const res  = await fetch(`/api/personnel?${params}`)
      const data = await res.json()

      const managerRoles: AppRole[] = ['ADMINISTRATOR', 'TRAINER']
      const filtered = (data.persons ?? []).filter(
        (p: { id: string; roles: AppRole[] }) =>
          p.id !== person.id && p.roles.some((r) => managerRoles.includes(r))
      )
      setManagers(filtered)
    }

    fetchManagers()
  }, [departmentId, person.id])

  function handleDepartmentChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const deptId = e.target.value
    setDepartmentId(deptId)
    setUnitId('')
    setSectionId('')
    setManagerId('')
  }

  function handleUnitChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setUnitId(e.target.value)
    setSectionId('')
  }

  function toggleRole(role: AppRole) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  const availableRoles = employeeType === 'QBD' ? QBD_ROLES : employeeType === 'CONTRACTUAL' ? CONTRACTUAL_ROLES : []

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!departmentId || !unitId) {
      setError('Department and Unit are required.')
      return
    }
    if (employeeType !== 'GUEST' && roles.length === 0) {
      setError('Select at least one role.')
      return
    }

    setModalOpen(true)
  }

  async function handleConfirm(justification: string, password?: string) {
    setModalOpen(false)
    setLoading(true)
    setError(null)

    const finalRoles: AppRole[] =
      employeeType === 'GUEST'        ? ['GUEST_TRAINER'] :
      employeeType === 'CONTRACTUAL'  ? ['CONTRACTUAL_EMPLOYEE', ...roles] :
      roles

    const res = await fetch(`/api/personnel/${person.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        roles:        finalRoles,
        departmentId,
        unitId,
        sectionId:    sectionId || undefined,
        managerId:    managerId || null,
        justification,
        password,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.message ?? 'Failed to update person.')
      return
    }

    setSuccess('Person updated successfully.')
    router.refresh()
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
  const inputStyle = { borderColor: '#d1d5db', background: '#fff' }

  return (
    <>
      <div
        className="bg-white rounded-2xl border p-6"
        style={{ borderColor: '#e5e7eb' }}
      >
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Edit role &amp; organization
        </h2>

        <form onSubmit={handleSubmitClick} className="flex flex-col gap-5">

          {/* Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Role(s)
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
                  Guest Trainer's role is fixed and cannot be changed here.
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
                    Also tagged as {ROLE_LABELS.CONTRACTUAL_EMPLOYEE} — this stays fixed.
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
                value={departmentId}
                onChange={handleDepartmentChange}
                className={inputClass}
                style={inputStyle}
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
                value={unitId}
                onChange={handleUnitChange}
                disabled={units.length === 0}
                className={inputClass}
                style={{
                  ...inputStyle,
                  opacity: units.length === 0 ? 0.5 : 1,
                  cursor:  units.length === 0 ? 'not-allowed' : 'auto',
                }}
              >
                <option value="">
                  {!departmentId ? 'Select a department first' : 'Select unit'}
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
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={sections.length === 0}
                className={inputClass}
                style={{
                  ...inputStyle,
                  opacity: sections.length === 0 ? 0.5 : 1,
                  cursor:  sections.length === 0 ? 'not-allowed' : 'auto',
                }}
              >
                <option value="">
                  {!unitId
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
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              disabled={!departmentId}
              className={inputClass}
              style={{
                ...inputStyle,
                opacity: departmentId ? 1 : 0.5,
                cursor:  departmentId ? 'auto' : 'not-allowed',
              }}
            >
              <option value="">
                {!departmentId
                  ? 'Select a department first'
                  : managers.length === 0
                  ? 'No managers available in this department'
                  : 'No reporting manager'}
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

          {error && (
            <div
              className="text-sm px-4 py-3 rounded-lg border"
              style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="text-sm px-4 py-3 rounded-lg border"
              style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}
            >
              {success}
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: loading ? '#4a9e6f' : '#2d6a4f' }}
            >
              {loading ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      <JustificationModal
        isOpen={modalOpen}
        title="Confirm person update"
        description="This will change the person's role(s) and/or organizational placement."
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        loading={loading}
        requirePassword
      />
    </>
  )
}
