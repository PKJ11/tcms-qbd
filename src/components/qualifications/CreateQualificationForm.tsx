'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'

interface Person    { id: string; name: string; employeeId: string; designation: string }
interface Technique { id: string; name: string; code: string; type: string }

interface Props {
  persons:    Person[]
  techniques: Technique[]
}

export function CreateQualificationForm({ persons, techniques }: Props) {
  const router = useRouter()

  const [form, setForm] = useState({
    personId:     '',
    techniqueId:  '',
    performedOn:  '',
    supervisorId: '',
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Supervisors = people who can act as trainer/supervisor
  const supervisors = persons.filter((p) => p.id !== form.personId)

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.personId || !form.techniqueId || !form.performedOn || !form.supervisorId) {
      setError('All fields are required.')
      return
    }
    if (form.personId === form.supervisorId) {
      setError('The analyst and supervisor cannot be the same person.')
      return
    }

    setModalOpen(true)
  }

  async function handleConfirm(justification: string) {
    setModalOpen(false)
    setLoading(true)
    setError(null)

    const res  = await fetch('/api/qualifications', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...form, justification }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.message ?? 'Failed to create qualification record')
      return
    }

    router.push('/qualifications')
    router.refresh()
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
  const inputStyle = { borderColor: '#d1d5db', background: '#fff' }
  const focusOn  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    e.target.style.borderColor = '#2d6a4f'
  const focusOff = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    e.target.style.borderColor = '#d1d5db'

  return (
    <>
      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e5e7eb' }}>
        <form onSubmit={handleSubmitClick} className="flex flex-col gap-5">

          {/* Analyst */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Analyst <span className="text-red-500">*</span>
            </label>
            <select
              value={form.personId}
              onChange={(e) => setForm({ ...form, personId: e.target.value })}
              className={inputClass}
              style={inputStyle}
              onFocus={focusOn}
              onBlur={focusOff}
            >
              <option value="">Select analyst</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.employeeId} · {p.designation}
                </option>
              ))}
            </select>
          </div>

          {/* Technique */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Analytical technique <span className="text-red-500">*</span>
            </label>
            <select
              value={form.techniqueId}
              onChange={(e) => setForm({ ...form, techniqueId: e.target.value })}
              className={inputClass}
              style={inputStyle}
              onFocus={focusOn}
              onBlur={focusOff}
            >
              <option value="">Select technique</option>
              {techniques.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code}) — {t.type}
                </option>
              ))}
            </select>
            {techniques.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                No techniques configured.{' '}
                <a href="/qualifications/techniques" style={{ color: '#2d6a4f' }}>
                  Add techniques first →
                </a>
              </p>
            )}
          </div>

          {/* Date performed + Supervisor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Date performed <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.performedOn}
                onChange={(e) => setForm({ ...form, performedOn: e.target.value })}
                className={inputClass}
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Supervised by <span className="text-red-500">*</span>
              </label>
              <select
                value={form.supervisorId}
                onChange={(e) => setForm({ ...form, supervisorId: e.target.value })}
                className={inputClass}
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              >
                <option value="">Select supervisor / trainer</option>
                {supervisors.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.designation}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Info box */}
          <div
            className="text-xs px-4 py-3 rounded-lg"
            style={{ background: '#f0fdf4', color: '#166534' }}
          >
            After creating this record:
            <ul className="mt-1 ml-3 list-disc flex flex-col gap-0.5">
              <li>The trainer/supervisor can sign off Step 1 to confirm competency</li>
              <li>QA/Training Head signs Step 2 for final approval</li>
              <li>Evidence documents (bench worksheets, etc.) can be uploaded</li>
              <li>Certificate is auto-generated on final approval</li>
            </ul>
          </div>

          {/* Error */}
          {error && (
            <div
              className="text-sm px-4 py-3 rounded-lg border"
              style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <a
              href="/qualifications"
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
              {loading ? 'Creating...' : 'Create record'}
            </button>
          </div>
        </form>
      </div>

      <JustificationModal
        isOpen={modalOpen}
        title="Confirm qualification record creation"
        description="This creates a formal On-Job Training competency record. The 2-step signatory chain will be initiated."
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        loading={loading}
      />
    </>
  )
}