'use client'

import { useState } from 'react'
import { JustificationModal } from '@/components/JustificationModal'

interface Question {
  id:            string
  questionText:  string
  optionA:       string
  optionB:       string
  optionC:       string
  optionD:       string
  correctAnswer: string
  isActive:      boolean
}

interface Bank {
  id:        string
  questions: Question[]
}

export function QuestionBankDetail({ bank }: { bank: Bank }) {
  const [questions, setQuestions] = useState(bank.questions)
  const [showForm,  setShowForm]  = useState(false)
  const [form, setForm] = useState({
    questionText: '', optionA: '', optionB: '', optionC: '', optionD: '',
    correctAnswer: 'A' as 'A' | 'B' | 'C' | 'D',
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  function handleAddClick(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.questionText || !form.optionA || !form.optionB || !form.optionC || !form.optionD) {
      setError('All fields are required.')
      return
    }
    setModalOpen(true)
  }

  async function handleConfirm(justification: string) {
    setModalOpen(false)
    setLoading(true)
    setError(null)

    const res  = await fetch('/api/assessments/questions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ bankId: bank.id, ...form, justification }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.message ?? 'Failed to add question')
      return
    }

    setQuestions((prev) => [...prev, data.question])
    setForm({ questionText: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A' })
    setShowForm(false)
  }

  const activeCount = questions.filter((q) => q.isActive).length

  const inputClass = "w-full px-3 py-2 rounded-lg border text-sm outline-none"
  const inputStyle = { borderColor: '#d1d5db' }

  return (
    <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e5e7eb' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">
          Questions ({activeCount} active)
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
          style={{ background: '#2d6a4f' }}
        >
          {showForm ? 'Cancel' : '+ Add question'}
        </button>
      </div>

      {/* Add question form */}
      {showForm && (
        <form onSubmit={handleAddClick} className="flex flex-col gap-3 mb-6 p-4 rounded-lg" style={{ background: '#fafafa' }}>
          <textarea
            placeholder="Question text"
            value={form.questionText}
            onChange={(e) => setForm({ ...form, questionText: e.target.value })}
            rows={2}
            className={inputClass}
            style={inputStyle}
          />
          <div className="grid grid-cols-2 gap-3">
            {(['A', 'B', 'C', 'D'] as const).map((opt) => (
              <div key={opt} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={form.correctAnswer === opt}
                  onChange={() => setForm({ ...form, correctAnswer: opt })}
                  className="accent-green-700"
                />
                <input
                  placeholder={`Option ${opt}`}
                  value={form[`option${opt}` as 'optionA']}
                  onChange={(e) => setForm({ ...form, [`option${opt}`]: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">Select the radio button next to the correct answer</p>

          {error && (
            <div className="text-sm px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="self-end px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: '#2d6a4f' }}
          >
            {loading ? 'Adding...' : 'Add question'}
          </button>
        </form>
      )}

      {/* Question list */}
      {questions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No questions added yet</p>
      ) : (
        <div className="flex flex-col gap-2">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className="p-3 rounded-lg border"
              style={{ borderColor: '#f3f4f6', background: q.isActive ? '#fff' : '#f9fafb' }}
            >
              <div className="text-sm font-medium text-gray-900 mb-1">
                {i + 1}. {q.questionText}
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                  <div
                    key={opt}
                    className={q.correctAnswer === opt ? 'font-semibold' : ''}
                    style={{ color: q.correctAnswer === opt ? '#166534' : undefined }}
                  >
                    {opt}. {q[`option${opt}` as 'optionA']}
                    {q.correctAnswer === opt && ' ✓'}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <JustificationModal
        isOpen={modalOpen}
        title="Confirm adding question"
        description="This question will be added to the active pool and may appear in future attempts."
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        loading={loading}
      />
    </div>
  )
}