'use client'

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { JustificationModal }  from '@/components/JustificationModal'

interface Topic      { id: string; name: string }
interface Department {
  id: string; name: string
  unit: { id: string; name: string }
  _count: { persons: number }
}
interface Person {
  id: string; name: string; employeeId: string; designation: string
  department: { id: string; name: string } | null
}

interface Props {
  topics:      Topic[]
  departments: Department[]
}

const TRIGGERS = [
  { value: 'INDUCTION',  label: 'Induction',    description: 'New joiner training' },
  { value: 'UPGRADE',    label: 'Role upgrade', description: 'Responsibility change' },
  { value: 'RETRAINING', label: 'Retraining',   description: 'Performance or deviation driven' },
  { value: 'REFRESHER',  label: 'Refresher',    description: 'Scheduled periodic refresh' },
]

export function AssignTrainingForm({ topics, departments }: Props) {
  const router = useRouter()

  const [mode, setMode] = useState<'bulk' | 'individual'>('bulk')

  const [form, setForm] = useState({
    topicId:      '',
    trigger:      'INDUCTION',
    dueDate:      '',
    departmentId: '',
  })

  const [persons,         setPersons]         = useState<Person[]>([])
  const [selectedPersons, setSelectedPersons] = useState<string[]>([])
  const [loadingPersons,  setLoadingPersons]  = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)

  // Fetch persons when switching to individual mode
  useEffect(() => {
    if (mode !== 'individual') return

    async function fetchPersons() {
      setLoadingPersons(true)
      const res  = await fetch('/api/personnel?isActive=true')
      const data = await res.json()
      setPersons(data.persons ?? [])
      setLoadingPersons(false)
    }
    fetchPersons()
  }, [mode])

  function togglePerson(id: string) {
    setSelectedPersons((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.topicId || !form.dueDate) {
      setError('Topic and due date are required.')
      return
    }
    if (mode === 'bulk' && !form.departmentId) {
      setError('Please select a department.')
      return
    }
    if (mode === 'individual' && selectedPersons.length === 0) {
      setError('Please select at least one person.')
      return
    }

    setModalOpen(true)
  }

  async function handleConfirm(justification: string) {
    setModalOpen(false)
    setLoading(true)
    setError(null)

    const endpoint = mode === 'bulk' ? '/api/assignments/bulk' : '/api/assignments'
    const body = mode === 'bulk'
      ? {
          departmentId: form.departmentId,
          topicId:      form.topicId,
          trigger:      form.trigger,
          dueDate:      form.dueDate,
          justification,
        }
      : {
          personIds: selectedPersons,
          topicId:   form.topicId,
          trigger:   form.trigger,
          dueDate:   form.dueDate,
          justification,
        }

    const res  = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.message ?? 'Failed to assign training.')
      return
    }

    const result = data.result
    setSuccess(
      `Assigned to ${result.created} person${result.created !== 1 ? 's' : ''}.` +
      (result.skipped > 0
        ? ` ${result.skipped} already had an active assignment and were skipped.`
        : '')
    )

    setTimeout(() => router.push('/assignments'), 2200)
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
  const inputStyle = { borderColor: '#d1d5db', background: '#fff' }
  const selectedDept = departments.find((d) => d.id === form.departmentId)

  return (
    <>
      <div
        className="bg-white rounded-2xl border p-6"
        style={{ borderColor: '#e5e7eb' }}
      >
        {/* Mode toggle */}
        <div className="flex gap-2 mb-5 p-1 rounded-lg" style={{ background: '#f4f6f8' }}>
          {(['bulk', 'individual'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="flex-1 py-2 rounded-md text-sm font-medium transition-all"
              style={{
                background: mode === m ? '#fff' : 'transparent',
                color:      mode === m ? '#2d6a4f' : '#6b7280',
                boxShadow:  mode === m ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              {m === 'bulk' ? 'By department' : 'Select individuals'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmitClick} className="flex flex-col gap-5">

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Training topic <span className="text-red-500">*</span>
            </label>
            <select
              name="topicId"
              value={form.topicId}
              onChange={handleChange}
              className={inputClass}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#2d6a4f'}
              onBlur={(e)  => e.target.style.borderColor = '#d1d5db'}
            >
              <option value="">Select topic</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Trigger + Due date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Trigger reason <span className="text-red-500">*</span>
              </label>
              <select
                name="trigger"
                value={form.trigger}
                onChange={handleChange}
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#2d6a4f'}
                onBlur={(e)  => e.target.style.borderColor = '#d1d5db'}
              >
                {TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Due date <span className="text-red-500">*</span>
              </label>
              <input
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={handleChange}
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#2d6a4f'}
                onBlur={(e)  => e.target.style.borderColor = '#d1d5db'}
              />
            </div>
          </div>

          {/* Bulk mode — department selection */}
          {mode === 'bulk' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                name="departmentId"
                value={form.departmentId}
                onChange={handleChange}
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#2d6a4f'}
                onBlur={(e)  => e.target.style.borderColor = '#d1d5db'}
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.unit.name} ({d._count.persons} people)
                  </option>
                ))}
              </select>
              {selectedDept && (
                <p className="text-xs mt-2" style={{ color: '#2d6a4f' }}>
                  This will assign training to all {selectedDept._count.persons} active person(s) in {selectedDept.name}.
                </p>
              )}
            </div>
          )}

          {/* Individual mode — person multi-select */}
          {mode === 'individual' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Select people <span className="text-red-500">*</span>
              </label>
              {loadingPersons ? (
                <p className="text-sm text-gray-400">Loading personnel...</p>
              ) : (
                <div
                  className="border rounded-lg max-h-64 overflow-y-auto"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  {persons.map((p) => {
                    const selected = selectedPersons.includes(p.id)
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
                        style={{
                          borderBottom: '1px solid #f3f4f6',
                          background:   selected ? '#f0fdf4' : '#fff',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => togglePerson(p.id)}
                          className="w-4 h-4 accent-green-700"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {p.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {p.employeeId} · {p.department?.name ?? 'No department'}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
              {selectedPersons.length > 0 && (
                <p className="text-xs mt-2" style={{ color: '#2d6a4f' }}>
                  {selectedPersons.length} person(s) selected
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="text-sm px-4 py-3 rounded-lg border"
              style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}
            >
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div
              className="text-sm px-4 py-3 rounded-lg border"
              style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}
            >
              {success}
            </div>
          )}

          {/* Actions */}
          {!success && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <a
                href="/assignments"
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
                {loading ? 'Assigning...' : 'Assign training'}
              </button>
            </div>
          )}
        </form>
      </div>

      <JustificationModal
        isOpen={modalOpen}
        title="Confirm training assignment"
        description={
          mode === 'bulk'
            ? `This will assign training to all active people in ${selectedDept?.name ?? 'the selected department'}.`
            : `This will assign training to ${selectedPersons.length} selected person(s).`
        }
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        loading={loading}
      />
    </>
  )
}