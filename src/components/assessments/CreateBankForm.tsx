'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'

interface Topic { id: string; name: string }

interface Props {
  topics:          Topic[]
  initialTopicId?: string
}

export function CreateBankForm({ topics, initialTopicId }: Props) {
  const router = useRouter()

  const hasInitialTopic = !!initialTopicId && topics.some((t) => t.id === initialTopicId)

  const [form, setForm] = useState({
    topicId:        hasInitialTopic ? initialTopicId! : '',
    assessmentType: 'MCQ',
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

          {/* Topic */}
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
                All topics already have assessment banks.
              </p>
            )}
          </div>

          {/* MCQ settings — fixed by SOP, not configurable */}
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg border text-sm text-gray-600" style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
            Every assessment uses the SOP-fixed settings: <strong>80%</strong> pass mark, <strong>5</strong> questions per attempt, <strong>3</strong> max attempts.
          </div>

          {error && (
            <div
              className="text-sm px-4 py-3 rounded-lg border"
              style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}
            >
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <a
              href="/assessments"
              className="px-4 py-2 rounded-lg text-sm border font-medium"
              style={{ borderColor: '#e5e7eb', color: '#374151' }}
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={loading || topics.length === 0}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
              style={{ background: '#2d6a4f' }}
            >
              {loading ? 'Creating...' : 'Create assessment bank'}
            </button>
          </div>
        </form>
      </div>

      <JustificationModal
        isOpen={modalOpen}
        title="Confirm assessment bank creation"
        description="This creates an MCQ bank with the SOP-fixed 80% pass mark, 5 questions per attempt, and 3 max attempts."
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        loading={loading}
      />
    </>
  )
}