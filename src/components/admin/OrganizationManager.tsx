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
  | { kind: 'add-department';    name: string }
  | { kind: 'add-unit';          name: string }
  | { kind: 'add-section';       name: string }
  | { kind: 'deactivate-department'; id: string; name: string }
  | null

export function OrganizationManager({ departments }: Props) {
  const router = useRouter()

  const [selectedDeptId, setSelectedDeptId] = useState('')
  const [selectedUnitId, setSelectedUnitId] = useState('')

  const [deptForm,    setDeptForm]    = useState({ name: '' })
  const [unitForm,    setUnitForm]    = useState({ name: '' })
  const [sectionForm, setSectionForm] = useState({ name: '' })

  const [pending, setPending] = useState<PendingAction>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const selectedDept = departments.find((d) => d.id === selectedDeptId)
  const units        = selectedDept?.units ?? []
  const selectedUnit = units.find((u) => u.id === selectedUnitId)
  const sections     = selectedUnit?.sections ?? []

  function handleDeptChange(deptId: string) {
    setSelectedDeptId(deptId)
    setSelectedUnitId('')
    setError(null)
  }

  function handleUnitChange(unitId: string) {
    setSelectedUnitId(unitId)
    setError(null)
  }

  function submitAddDept(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!deptForm.name.trim()) { setError('Department name is required.'); return }
    setPending({ kind: 'add-department', name: deptForm.name.trim() })
  }

  function submitAddUnit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!selectedDeptId) { setError('Select a department first.'); return }
    if (!unitForm.name.trim()) { setError('Unit name is required.'); return }
    setPending({ kind: 'add-unit', name: unitForm.name.trim() })
  }

  function submitAddSection(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!selectedUnitId) { setError('Select a unit first.'); return }
    if (!sectionForm.name.trim()) { setError('Section name is required.'); return }
    setPending({ kind: 'add-section', name: sectionForm.name.trim() })
  }

  async function handleConfirm(justification: string, password?: string) {
    if (!pending) return
    setLoading(true)
    setError(null)

    const req: { url: string; method: string; body: Record<string, unknown> } =
      pending.kind === 'add-department'
        ? { url: '/api/departments', method: 'POST',   body: { name: pending.name } }
      : pending.kind === 'add-unit'
        ? { url: '/api/units',       method: 'POST',   body: { name: pending.name, departmentId: selectedDeptId } }
      : pending.kind === 'add-section'
        ? { url: '/api/sections',    method: 'POST',   body: { name: pending.name, unitId: selectedUnitId } }
        : { url: '/api/departments', method: 'DELETE', body: { id: pending.id } }

    const res  = await fetch(req.url, {
      method:  req.method,
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...req.body, justification, password }),
    })
    const data = await res.json().catch(() => ({}))
    const kind = pending.kind
    setLoading(false)
    setPending(null)

    if (!res.ok) {
      setError(data.message ?? 'Action failed.')
      return
    }

    if (kind === 'add-department') setDeptForm({ name: '' })
    if (kind === 'add-unit')       setUnitForm({ name: '' })
    if (kind === 'add-section')    setSectionForm({ name: '' })
    if (kind === 'deactivate-department') { setSelectedDeptId(''); setSelectedUnitId('') }

    router.refresh()
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all'
  const inputStyle = { borderColor: '#d1d5db', background: '#fff' }

  const DeactivateBtn = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="ml-auto w-6 h-6 flex items-center justify-center rounded text-sm flex-shrink-0"
      style={{ color: '#dc2626', border: '1px solid #fecaca' }}
    >
      ×
    </button>
  )

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Department */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e5e7eb' }}>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">1. Department</h2>

          <div className="border rounded-lg overflow-hidden mb-4" style={{ borderColor: '#e5e7eb' }}>
            {departments.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-400">No departments yet.</div>
            ) : (
              departments.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2 px-3 py-2 transition-colors"
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    background:   selectedDeptId === d.id ? '#f0fdf4' : '#fff',
                  }}
                >
                  <input
                    type="radio"
                    name="department"
                    checked={selectedDeptId === d.id}
                    onChange={() => handleDeptChange(d.id)}
                    className="w-3.5 h-3.5 accent-green-700"
                  />
                  <span className="text-sm text-gray-800">{d.name}</span>
                  <span className="text-xs text-gray-400">· {d.code}</span>
                  <DeactivateBtn
                    label={`Deactivate ${d.name}`}
                    onClick={() => setPending({ kind: 'deactivate-department', id: d.id, name: d.name })}
                  />
                </div>
              ))
            )}
          </div>

          <form onSubmit={submitAddDept} className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add department</p>
            <input
              placeholder="Department name (e.g. Microbiology)"
              value={deptForm.name}
              onChange={(e) => setDeptForm({ name: e.target.value })}
              className={inputClass}
              style={inputStyle}
            />
            <p className="text-xs text-gray-400">A unique code will be generated automatically.</p>
            <button
              type="submit"
              className="px-3 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#2d6a4f' }}
            >
              + Add department
            </button>
          </form>

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
              <div className="border rounded-lg overflow-hidden mb-4" style={{ borderColor: '#e5e7eb' }}>
                {units.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-gray-400">No units yet.</div>
                ) : (
                  units.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-2 px-3 py-2 transition-colors"
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
                      <span className="text-xs text-gray-400">
                        · {u.sections.length} section{u.sections.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={submitAddUnit} className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add unit</p>
                <input
                  placeholder="Unit name (e.g. Unit-III)"
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({ name: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
                <p className="text-xs text-gray-400">A unique code will be generated automatically.</p>
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
              <div className="border rounded-lg overflow-hidden mb-4" style={{ borderColor: '#e5e7eb' }}>
                {sections.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-gray-400">No sections yet.</div>
                ) : (
                  sections.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-800"
                      style={{ borderBottom: '1px solid #f3f4f6' }}
                    >
                      <span>{s.name}</span>
                      <span className="text-xs text-gray-400">· {s.code}</span>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={submitAddSection} className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add section</p>
                <input
                  placeholder="Section name (e.g. LCMS)"
                  value={sectionForm.name}
                  onChange={(e) => setSectionForm({ name: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
                <p className="text-xs text-gray-400">A unique code will be generated automatically.</p>
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
        title={
          pending?.kind === 'add-department'    ? 'Confirm new department'
          : pending?.kind === 'add-unit'        ? 'Confirm new unit'
          : pending?.kind === 'add-section'     ? 'Confirm new section'
          : pending?.kind === 'deactivate-department' ? 'Deactivate department'
          : ''
        }
        description={
          !pending ? ''
          : pending.kind === 'add-department' ? `Create department "${pending.name}".`
          : pending.kind === 'add-unit'       ? `Create unit "${pending.name}" under ${selectedDept?.name}.`
          : pending.kind === 'add-section'    ? `Create section "${pending.name}" under ${selectedUnit?.name}.`
          : `Deactivate "${pending.name}"? It is hidden everywhere and can only be recreated by name. Blocked if active members or units remain.`
        }
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
        loading={loading}
        requirePassword
      />
    </>
  )
}
