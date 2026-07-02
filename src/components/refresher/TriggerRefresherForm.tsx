'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'

interface Topic  { id: string; name: string }
interface Person {
  id: string; name: string; employeeId: string; designation: string
  department: { id: string; name: string } | null
}

interface Props {
  topics:  Topic[]
  persons: Person[]
}

const TRIGGER_TYPES = [
  {
    value:       'PLANNED',
    label:       'Planned',
    description: 'Scheduled periodic refresh — routine compliance cycle',
  },
  {
    value:       'DEVIATION',
    label:       'Deviation',
    description: 'Triggered by deviation findings observed during QA review',
  },
  {
    value:       'INCIDENT',
    label:       'Incident',
    description: 'Triggered by an incident requiring re-evaluation of competency',
  },
]

export function TriggerRefresherForm({ topics, persons }: Props) {
  const router = useRouter()

  const [form, setForm] = useState({
    topicId:     '',
    triggerType: 'PLANNED',
    dueDate:     '',
  })

  const [selectedPersons, setSelectedPersons] = useState<string[]>([])
  const [search,           setSearch]         = useState('')
  const [modalOpen,        setModalOpen]      = useState(false)
  const [loading,          setLoading]        = useState(false)
  const [error,            setError]          = useState<string | null>(null)
  const [success,          setSuccess]        = useState<string | null>(null)

  const filteredPersons = persons.filter((p) =>
    search === '' ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.employeeId.toLowerCase().includes(search.toLowerCase())
  )

  function togglePerson(id: string) {
    setSelectedPersons((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.topicId || !form.dueDate) {
      setError('Topic and due date are required.')
      return
    }
    if (selectedPersons.length === 0) {
      setError('Please select at least one person.')
      return
    }

    setModalOpen(true)
  }

  async function handleConfirm(justification: string) {
    setModalOpen(false)
    setLoading(true)
    setError(null)

    const res = await fetch('/api/refresher', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        personIds:   selectedPersons,
        topicId:     form.topicId,
        triggerType: form.triggerType,
        dueDate:     form.dueDate,
        justification,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.message ?? 'Failed to trigger refresher.')
      return
    }

    const result = data.result
    setSuccess(
      `Refresher training triggered for ${result.created} person(s).` +
      (result.skipped > 0
        ? ` ${result.skipped} already had a pending refresher and were skipped.`
        : '')
    )

    setTimeout(() => router.push('/refresher'), 2200)
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
  const inputStyle = { borderColor: '#d1d5db', background: '#fff' }

  return (
    <>
      <div
        className="bg-white rounded-2xl border p-6"
        style={{ borderColor: '#e5e7eb' }}
      >
        <form onSubmit={handleSubmitClick} className="flex flex-col gap-5">

          {/* Trigger type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trigger type <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-2">
              {TRIGGER_TYPES.map((t) => {
                const selected = form.triggerType === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, triggerType: t.value }))}
                    className="p-3 rounded-lg border text-left transition-all"
                    style={{
                      borderColor: selected ? '#2d6a4f' : '#e5e7eb',
                      background:  selected ? '#f0fdf4' : '#fff',
                    }}
                  >
                    <div className="text-sm font-medium text-gray-900">{t.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Topic + Due date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Topic <span className="text-red-500">*</span>
              </label>
              <select
                value={form.topicId}
                onChange={(e) => setForm({ ...form, topicId: e.target.value })}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Due date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#2d6a4f'}
                onBlur={(e)  => e.target.style.borderColor = '#d1d5db'}
              />
            </div>
          </div>

          {/* Person selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Select people <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Search by name or employee ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none mb-2"
              style={{ borderColor: '#e5e7eb' }}
            />
            <div
              className="border rounded-lg max-h-56 overflow-y-auto"
              style={{ borderColor: '#e5e7eb' }}
            >
              {filteredPersons.map((p) => {
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
                      <div className="text-sm font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-400">
                        {p.employeeId} · {p.department?.name ?? 'No department'}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
            {selectedPersons.length > 0 && (
              <p className="text-xs mt-2" style={{ color: '#2d6a4f' }}>
                {selectedPersons.length} person(s) selected
              </p>
            )}
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
                href="/refresher"
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
                {loading ? 'Triggering...' : 'Trigger refresher'}
              </button>
            </div>
          )}
        </form>
      </div>

      <JustificationModal
        isOpen={modalOpen}
        title="Confirm refresher trigger"
        description={`This will assign refresher training to ${selectedPersons.length} selected person(s) and create their training assignment. The reason you provide here is the official record of why this refresher was raised.`}
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        loading={loading}
        minLength={15}
      />
    </>
  )
}