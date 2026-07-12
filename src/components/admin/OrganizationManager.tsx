'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'

interface Section    { id: string; name: string; code: string }
interface Unit       { id: string; name: string; code: string; sections: Section[] }
interface Department { id: string; name: string; code: string; units: Unit[] }

interface Props {
  departments: Department[]
}

type PendingAction =
  | { kind: 'unit';    name: string; code: string }
  | { kind: 'section'; name: string; code: string }
  | null

export function OrganizationManager({ departments }: Props) {
  const router = useRouter()

  const [selectedDeptId, setSelectedDeptId] = useState('')
  const [selectedUnitId, setSelectedUnitId] = useState('')

  const [unitForm,    setUnitForm]    = useState({ name: '', code: '' })
  const [sectionForm, setSectionForm] = useState({ name: '', code: '' })

  const [pending, setPending] = useState<PendingAction>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const selectedDept = departments.find((d) => d.id === selectedDeptId)
  const units        = selectedDept?.units ?? []
  const selectedUnit = units.find((u) => u.id === selectedUnitId)
  const sections      = selectedUnit?.sections ?? []

  function handleDeptChange(deptId: string) {
    setSelectedDeptId(deptId)
    setSelectedUnitId('')
    setError(null)
  }

  function handleUnitChange(unitId: string) {
    setSelectedUnitId(unitId)
    setError(null)
  }

  function handleAddUnitClick(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!selectedDeptId) { setError('Select a department first.'); return }
    if (!unitForm.name.trim() || !unitForm.code.trim()) {
      setError('Unit name and code are required.')
      return
    }
    setPending({ kind: 'unit', name: unitForm.name.trim(), code: unitForm.code.trim() })
  }

  function handleAddSectionClick(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!selectedUnitId) { setError('Select a unit first.'); return }
    if (!sectionForm.name.trim() || !sectionForm.code.trim()) {
      setError('Section name and code are required.')
      return
    }
    setPending({ kind: 'section', name: sectionForm.name.trim(), code: sectionForm.code.trim() })
  }

  async function handleConfirm(justification: string) {
    if (!pending) return
    setLoading(true)
    setError(null)

    const endpoint = pending.kind === 'unit' ? '/api/units' : '/api/sections'
    const body = pending.kind === 'unit'
      ? { name: pending.name, code: pending.code, departmentId: selectedDeptId, justification }
      : { name: pending.name, code: pending.code, unitId: selectedUnitId, justification }

    const res  = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)
    setPending(null)

    if (!res.ok) {
      setError(data.message ?? `Failed to create ${pending.kind}.`)
      return
    }

    if (pending.kind === 'unit') {
      setUnitForm({ name: '', code: '' })
    } else {
      setSectionForm({ name: '', code: '' })
    }

    router.refresh()
  }

  const inputClass = "w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all"
  const inputStyle = { borderColor: '#d1d5db', background: '#fff' }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Department */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e5e7eb' }}>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">1. Department</h2>
          <select
            value={selectedDeptId}
            onChange={(e) => handleDeptChange(e.target.value)}
            className={inputClass}
            style={inputStyle}
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {selectedDept && (
            <p className="text-xs text-gray-400 mt-3">
              {units.length} unit{units.length !== 1 ? 's' : ''} in {selectedDept.name}
            </p>
          )}
        </div>

        {/* Unit */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e5e7eb' }}>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">2. Unit</h2>

          {!selectedDeptId ? (
            <p className="text-xs text-gray-400">Select a department first.</p>
          ) : (
            <>
              <div
                className="border rounded-lg overflow-hidden mb-4"
                style={{ borderColor: '#e5e7eb' }}
              >
                {units.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-gray-400">No units yet.</div>
                ) : (
                  units.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        background:   selectedUnitId === u.id ? '#f0fdf4' : '#fff',
                      }}
                    >
                      <input
                        type="radio"
                        name="unit"
                        checked={selectedUnitId === u.id}
                        onChange={() => handleUnitChange(u.id)}
                        className="w-3.5 h-3.5 accent-green-700"
                      />
                      <span className="text-sm text-gray-800">{u.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{u.sections.length} section{u.sections.length !== 1 ? 's' : ''}</span>
                    </label>
                  ))
                )}
              </div>

              <form onSubmit={handleAddUnitClick} className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add unit</p>
                <input
                  placeholder="Unit name (e.g. Unit-III)"
                  value={unitForm.name}
                  onChange={(e) => setUnitForm((p) => ({ ...p, name: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                />
                <input
                  placeholder="Code (e.g. U3)"
                  value={unitForm.code}
                  onChange={(e) => setUnitForm((p) => ({ ...p, code: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: '#2d6a4f' }}
                >
                  + Add unit to {selectedDept?.name}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Section */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e5e7eb' }}>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">3. Section</h2>

          {!selectedUnitId ? (
            <p className="text-xs text-gray-400">Select a unit first.</p>
          ) : (
            <>
              <div
                className="border rounded-lg overflow-hidden mb-4"
                style={{ borderColor: '#e5e7eb' }}
              >
                {sections.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-gray-400">No sections yet.</div>
                ) : (
                  sections.map((s) => (
                    <div
                      key={s.id}
                      className="px-3 py-2 text-sm text-gray-800"
                      style={{ borderBottom: '1px solid #f3f4f6' }}
                    >
                      {s.name}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddSectionClick} className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add section</p>
                <input
                  placeholder="Section name (e.g. LCMS)"
                  value={sectionForm.name}
                  onChange={(e) => setSectionForm((p) => ({ ...p, name: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                />
                <input
                  placeholder="Code (e.g. LCMS)"
                  value={sectionForm.code}
                  onChange={(e) => setSectionForm((p) => ({ ...p, code: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: '#2d6a4f' }}
                >
                  + Add section to {selectedUnit?.name}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {error && (
        <div
          className="text-sm px-4 py-3 rounded-lg border mt-4"
          style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}
        >
          {error}
        </div>
      )}

      <JustificationModal
        isOpen={!!pending}
        title={pending?.kind === 'unit' ? 'Confirm new unit' : 'Confirm new section'}
        description={
          pending?.kind === 'unit'
            ? `Create unit "${pending.name}" (${pending.code}) under ${selectedDept?.name}.`
            : pending
            ? `Create section "${pending.name}" (${pending.code}) under ${selectedUnit?.name}.`
            : ''
        }
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
        loading={loading}
      />
    </>
  )
}
