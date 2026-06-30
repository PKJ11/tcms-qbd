'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'

interface Topic { id: string; name: string }

export function CreateBankForm({ topics }: { topics: Topic[] }) {
  const router = useRouter()

  const [form, setForm] = useState({
    topicId:             '',
    passingPercentage:   70,
    questionsPerAttempt: 10,
    maxAttempts:         3,
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.topicId) {
      setError('Please select a topic.')
      return
    }
    setModalOpen(true)
  }

  async function handleConfirm(justification: string) {
    setModalOpen(false)
    setLoading(true)
    setError(null)

    const res  = await fetch('/api/assessments/banks', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...form, justification }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.message ?? 'Failed to create question bank')
      return
    }

    router.push(`/assessments/banks/${data.bank.id}`)
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
  const inputStyle = { borderColor: '#d1d5db' }

  return (
    <>
      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e5e7eb' }}>
        <form onSubmit={handleSubmitClick} className="flex flex-col gap-5">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Topic <span className="text-red-500">*</span>
            </label>
            <select
              value={form.topicId}
              onChange={(e) => setForm({ ...form, topicId: e.target.value })}
              className={inputClass}
              style={inputStyle}
            >
              <option value="">Select topic without an existing bank</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {topics.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                All topics already have question banks.
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Pass mark (%)
              </label>
              <input
                type="number" min={1} max={100}
                value={form.passingPercentage}
                onChange={(e) => setForm({ ...form, passingPercentage: Number(e.target.value) })}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Questions/attempt
              </label>
              <input
                type="number" min={1}
                value={form.questionsPerAttempt}
                onChange={(e) => setForm({ ...form, questionsPerAttempt: Number(e.target.value) })}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Max attempts
              </label>
              <input
                type="number" min={1} max={10}
                value={form.maxAttempts}
                onChange={(e) => setForm({ ...form, maxAttempts: Number(e.target.value) })}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm px-4 py-3 rounded-lg border" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <a href="/assessments" className="px-4 py-2 rounded-lg text-sm border font-medium" style={{ borderColor: '#e5e7eb', color: '#374151' }}>
              Cancel
            </a>
            <button
              type="submit"
              disabled={loading || topics.length === 0}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
              style={{ background: '#2d6a4f' }}
            >
              {loading ? 'Creating...' : 'Create question bank'}
            </button>
          </div>
        </form>
      </div>

      <JustificationModal
        isOpen={modalOpen}
        title="Confirm question bank creation"
        description="This will allow questions to be added and the topic to require assessment-based completion."
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        loading={loading}
      />
    </>
  )
}