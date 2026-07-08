'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'

interface Unit       { id: string; name: string }
interface Department { id: string; name: string; unitId: string }
interface Manager    { id: string; name: string; designation: string }

interface Props {
  units:       Unit[]
  departments: Department[]
}

const ROLES = [
  { value: 'USER',          label: 'User'          },
  { value: 'MANAGER',       label: 'Manager'       },
  { value: 'TRAINER',       label: 'Trainer'       },
  { value: 'TRAINING_HEAD', label: 'Training Head' },
  { value: 'ADMINISTRATOR',   label: 'ADMINISTRATOR'   },
  { value: 'REVIEWER',            label: 'REVIEWER'            },
]

export function CreatePersonForm({ units, departments }: Props) {
  const router = useRouter()

  const [form, setForm] = useState({
    employeeId:   '',
    name:         '',
    email:        '',
    role:         'USER',
    designation:  '',
    joiningDate:  '',
    unitId:       '',
    departmentId: '',
    managerId:    '',
  })

  const [managers,   setManagers]   = useState<Manager[]>([])
  const [modalOpen,  setModalOpen]  = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [success,    setSuccess]    = useState<string | null>(null)

  // Filter departments by selected unit
  const filteredDepts = departments.filter(
    (d) => d.unitId === form.unitId
  )

  // Fetch potential managers when unit changes
  useEffect(() => {
    if (!form.unitId) {
      setManagers([])
      return
    }

    async function fetchManagers() {
      const params = new URLSearchParams({
        unitId:   form.unitId,
        isActive: 'true',
      })
      const res  = await fetch(`/api/personnel?${params}`)
      const data = await res.json()

      // Only MANAGER, TRAINING_HEAD, ADMINISTRATOR can be managers
      const managerRoles = ['MANAGER', 'TRAINER', 'TRAINING_HEAD', 'ADMINISTRATOR', 'REVIEWER']
      const filtered = (data.persons ?? []).filter(
        (p: { role: string }) => managerRoles.includes(p.role)
      )
      setManagers(filtered)
    }

    fetchManagers()
  }, [form.unitId])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
      // Reset department and manager when unit changes
      ...(name === 'unitId' ? { departmentId: '', managerId: '' } : {}),
    }))
  }

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.employeeId || !form.name || !form.email ||
        !form.designation || !form.joiningDate || !form.unitId) {
      setError('Please fill in all required fields.')
      return
    }

    setModalOpen(true)
  }

  async function handleConfirm(justification: string) {
    setModalOpen(false)
    setLoading(true)
    setError(null)

    const res = await fetch('/api/personnel', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...form, justification }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.message ?? 'Failed to create person.')
      return
    }

    setSuccess(
      `Person created successfully. A temporary password has been emailed to ${form.email}.`
    )

    setTimeout(() => router.push('/personnel'), 2000)
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
        <form onSubmit={handleSubmitClick} className="flex flex-col gap-5">

          {/* Row 1 — Employee ID + Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <input
                name="employeeId"
                value={form.employeeId}
                onChange={handleChange}
                placeholder="EMP-004"
                className={inputClass}
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              />
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
                Email <span className="text-red-500">*</span>
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

          {/* Row 3 — Role + Joining Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className={inputClass}
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Joining Date <span className="text-red-500">*</span>
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

          {/* Row 4 — Unit + Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                name="unitId"
                value={form.unitId}
                onChange={handleChange}
                className={inputClass}
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              >
                <option value="">Select unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Department
              </label>
              <select
                name="departmentId"
                value={form.departmentId}
                onChange={handleChange}
                disabled={!form.unitId}
                className={inputClass}
                style={{
                  ...inputStyle,
                  opacity: form.unitId ? 1 : 0.5,
                  cursor:  form.unitId ? 'auto' : 'not-allowed',
                }}
                onFocus={focusOn}
                onBlur={focusOff}
              >
                <option value="">Select department</option>
                {filteredDepts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5 — Manager */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Reporting Manager
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <select
              name="managerId"
              value={form.managerId}
              onChange={handleChange}
              disabled={!form.unitId}
              className={inputClass}
              style={{
                ...inputStyle,
                opacity: form.unitId ? 1 : 0.5,
                cursor:  form.unitId ? 'auto' : 'not-allowed',
              }}
              onFocus={focusOn}
              onBlur={focusOff}
            >
              <option value="">
                {!form.unitId
                  ? 'Select a unit first'
                  : managers.length === 0
                  ? 'No managers available in this unit'
                  : 'Select reporting manager'}
              </option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.designation}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Only active Managers, Trainers, Training Heads, and above are shown.
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
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
          </div>
        </form>
      </div>

      <JustificationModal
        isOpen={modalOpen}
        title="Confirm person creation"
        description={`Creating account for ${form.name || 'new person'}. A temporary password will be emailed.`}
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        loading={loading}
      />
    </>
  )
}