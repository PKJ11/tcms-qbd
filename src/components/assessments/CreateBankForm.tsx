'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'

interface Topic { id: string; name: string }

const ASSESSMENT_TYPES = [
  {
    value:       'MCQ',
    label:       'Written assessment (MCQ)',
    description: 'Randomised multiple-choice questions with auto-grading',
  },
  {
    value:       'ORAL',
    label:       'Oral / practical assessment',
    description: 'Trainer manually records outcome after verbal or practical evaluation',
  },
]

export function CreateBankForm({ topics }: { topics: Topic[] }) {
  const router = useRouter()

  const [form, setForm] = useState({
    topicId:             '',
    passingPercentage:   80,   // SOP mandates 80%
    questionsPerAttempt: 10,
    maxAttempts:         3,
    assessmentType:      'MCQ',
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

          {/* Assessment type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assessment type <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-2">
              {ASSESSMENT_TYPES.map((t) => {
                const selected = form.assessmentType === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, assessmentType: t.value })}
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

          {/* MCQ-specific settings — hide for ORAL */}
          {form.assessmentType === 'MCQ' && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Pass mark (%)
                  <span className="text-xs text-gray-400 font-normal ml-1">SOP: 80%</span>
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
                  Questions / attempt
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
                  <span className="text-xs text-gray-400 font-normal ml-1">SOP: 3</span>
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
          )}

          {/* ORAL info box */}
          {form.assessmentType === 'ORAL' && (
            <div
              className="text-xs px-4 py-3 rounded-lg"
              style={{ background: '#eff6ff', color: '#1d4ed8' }}
            >
              For oral assessments, the Trainer manually records Pass or Fail after
              verbally or practically evaluating the trainee. No question bank is needed.
              The SOP 80% mark criterion is applied by the Trainer's judgement.
            </div>
          )}

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
        description={
          form.assessmentType === 'ORAL'
            ? 'This creates an oral assessment bank. Trainer will manually record outcomes.'
            : `This creates an MCQ bank with ${form.passingPercentage}% pass mark and ${form.maxAttempts} max attempts.`
        }
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        loading={loading}
      />
    </>
  )
}