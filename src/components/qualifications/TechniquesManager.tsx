'use client'

import { useState } from 'react'
import { JustificationModal } from '@/components/JustificationModal'

interface Department { id: string; name: string;  }
interface Technique  {
  id: string; name: string; code: string; type: string
  isActive: boolean
  department: { id: string; name: string;  }
  _count: { qualifications: number }
}

interface Props {
  techniques: Technique[]
  canCreate:  boolean
}

const TECHNIQUE_TYPES = ['METHOD', 'INSTRUMENT', 'TECHNIQUE']

export function TechniquesManager({ techniques: initial, canCreate }: Props) {
  const [techniques,   setTechniques]   = useState(initial)
  const [showForm,     setShowForm]     = useState(false)
  const [departments,  setDepartments]  = useState<Department[]>([])
  const [form, setForm] = useState({
    name:         '',
    code:         '',
    type:         'TECHNIQUE',
    departmentId: '',
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function loadDepts() {
  if (departments.length > 0) return
  const res  = await fetch('/api/assignments/departments')
  const data = await res.json()
  setDepartments(data.departments ?? [])
}
  async function handleShowForm() {
    await loadDepts()
    setShowForm(true)
  }

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name || !form.code || !form.departmentId) {
      setError('Name, code, and department are required.')
      return
    }
    setModalOpen(true)
  }

  async function handleConfirm(justification: string) {
    setModalOpen(false)
    setLoading(true)

    const res  = await fetch('/api/qualifications/techniques', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...form, justification }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.message ?? 'Failed to create technique')
      return
    }

    // Reload techniques
    const listRes  = await fetch('/api/qualifications/techniques')
    const listData = await listRes.json()
    setTechniques(listData.techniques ?? [])
    setShowForm(false)
    setForm({ name: '', code: '', type: 'TECHNIQUE', departmentId: '' })
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">{techniques.length} technique(s) configured</span>
        {canCreate && (
          <button
            onClick={handleShowForm}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: '#2d6a4f' }}
          >
            + Add technique
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div
          className="bg-white rounded-xl border p-5 mb-4"
          style={{ borderColor: '#e5e7eb' }}
        >
          <form onSubmit={handleSubmitClick} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. HPLC Assay — STP-042"
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: '#d1d5db' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. HPLC-001"
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: '#d1d5db' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: '#d1d5db' }}
                >
                  {TECHNIQUE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: '#d1d5db' }}
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>
            )}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm border font-medium"
                style={{ borderColor: '#e5e7eb', color: '#374151' }}
              >
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: '#2d6a4f' }}
              >
                {loading ? 'Creating...' : 'Create technique'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Techniques list */}
      {techniques.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-sm text-gray-400">No techniques configured yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {techniques.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-xl border p-4"
              style={{ borderColor: '#e5e7eb' }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {t.code} · {t.type} · {t.department.name}
                  </div>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={
                    t.isActive
                      ? { background: '#f0fdf4', color: '#166534' }
                      : { background: '#f9fafb', color: '#6b7280' }
                  }
                >
                  {t.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                <span className="text-gray-400">Qualifications: </span>
                {t._count.qualifications}
              </div>
            </div>
          ))}
        </div>
      )}

      <JustificationModal
        isOpen={modalOpen}
        title="Confirm technique creation"
        description="This will add the technique to the master list and make it available for analyst qualifications."
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        loading={loading}
      />
    </>
  )
}