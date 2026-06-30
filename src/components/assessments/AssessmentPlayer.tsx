'use client'

import { useState, useEffect } from 'react'

interface Question {
  id:           string
  questionText: string
  optionA:      string
  optionB:      string
  optionC:      string
  optionD:      string
}

interface Props {
  assignmentId: string
  bankId:       string
  topicName:    string
  onDone:       () => void
}

interface Result {
  score:        number
  outcome:      string
  attemptNo:    number
  maxAttempts:  number
  correctCount: number
  totalCount:   number
}

export function AssessmentPlayer({ assignmentId, bankId, topicName, onDone }: Props) {
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [questions,  setQuestions]  = useState<Question[]>([])
  const [answers,    setAnswers]    = useState<Record<string, string>>({})
  const [current,    setCurrent]    = useState(0)
  const [startedAt,  setStartedAt]  = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [result,     setResult]     = useState<Result | null>(null)
  const [passMark,   setPassMark]   = useState(70)

  useEffect(() => {
    async function start() {
      setLoading(true)
      setError(null)
      const res  = await fetch('/api/assessments/attempt/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bankId, assignmentId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message ?? 'Failed to start assessment')
        setLoading(false)
        return
      }

      setQuestions(data.questions)
      setPassMark(data.bank.passingPercentage)
      setStartedAt(new Date().toISOString())
      setLoading(false)
    }
    start()
  }, [bankId, assignmentId])

  function selectAnswer(questionId: string, option: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    const res  = await fetch('/api/assessments/attempt/submit', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ assignmentId, bankId, answers, startedAt }),
    })
    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(data.message ?? 'Submission failed')
      return
    }

    setResult(data)
  }

  const allAnswered = questions.length > 0 &&
    questions.every((q) => answers[q.id] !== undefined)

  // ── Result screen ──────────────────────────────────────────────
  if (result) {
    const passed = result.outcome === 'PASS'
    return (
      <div
        className="bg-white rounded-2xl border p-8 text-center max-w-lg mx-auto"
        style={{ borderColor: '#e5e7eb' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: passed ? '#f0fdf4' : '#fef2f2' }}
        >
          {passed ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          )}
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-1">
          {passed ? 'Assessment passed' : result.outcome === 'NEEDS_RETRAINING' ? 'Retraining required' : 'Assessment not passed'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {topicName} &nbsp;·&nbsp; Attempt {result.attemptNo} of {result.maxAttempts}
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <div className="text-2xl font-bold text-gray-900">{result.score}%</div>
            <div className="text-xs text-gray-400">Your score</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{passMark}%</div>
            <div className="text-xs text-gray-400">Pass mark</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {result.correctCount}/{result.totalCount}
            </div>
            <div className="text-xs text-gray-400">Correct</div>
          </div>
        </div>

        {result.outcome === 'NEEDS_RETRAINING' && (
          <div
            className="text-sm px-4 py-3 rounded-lg mb-6 text-left"
            style={{ background: '#fef2f2', color: '#991b1b' }}
          >
            You have exhausted all {result.maxAttempts} attempts. A retraining assignment has been automatically created for you to review the material again.
          </div>
        )}

        {result.outcome === 'FAIL' && (
          <div
            className="text-sm px-4 py-3 rounded-lg mb-6 text-left"
            style={{ background: '#fefce8', color: '#854d0e' }}
          >
            You can try again — {result.maxAttempts - result.attemptNo} attempt(s) remaining.
          </div>
        )}

        <button
          onClick={onDone}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ background: '#2d6a4f' }}
        >
          Back to assessments
        </button>
      </div>
    )
  }

  // ── Loading / error states ───────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Preparing your assessment...
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="bg-white rounded-2xl border p-8 text-center max-w-lg mx-auto"
        style={{ borderColor: '#e5e7eb' }}
      >
        <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
        <button
          onClick={onDone}
          className="mt-4 px-4 py-2 rounded-lg text-sm border font-medium"
          style={{ borderColor: '#e5e7eb', color: '#374151' }}
        >
          Go back
        </button>
      </div>
    )
  }

  // ── Question player ────────────────────────────────────────────
  const q = questions[current]

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-700">{topicName}</span>
        <span className="text-xs text-gray-400">
          Question {current + 1} of {questions.length}
        </span>
      </div>
      <div className="w-full rounded-full h-1.5 mb-6" style={{ background: '#e5e7eb' }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{
            width: `${((current + 1) / questions.length) * 100}%`,
            background: '#2d6a4f',
          }}
        />
      </div>

      {/* Question card */}
      <div
        className="bg-white rounded-2xl border p-6 mb-4"
        style={{ borderColor: '#e5e7eb' }}
      >
        <h3 className="text-base font-medium text-gray-900 mb-5">
          {q.questionText}
        </h3>

        <div className="flex flex-col gap-2.5">
          {(['A', 'B', 'C', 'D'] as const).map((opt) => {
            const optionText = q[`option${opt}` as 'optionA']
            const selected   = answers[q.id] === opt
            return (
              <button
                key={opt}
                onClick={() => selectAnswer(q.id, opt)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all"
                style={{
                  borderColor: selected ? '#2d6a4f' : '#e5e7eb',
                  background:  selected ? '#f0fdf4' : '#fff',
                }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                  style={{
                    background: selected ? '#2d6a4f' : '#f3f4f6',
                    color:      selected ? '#fff'    : '#6b7280',
                  }}
                >
                  {opt}
                </div>
                <span className="text-sm text-gray-800">{optionText}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="px-4 py-2 rounded-lg text-sm border font-medium disabled:opacity-40"
          style={{ borderColor: '#e5e7eb', color: '#374151' }}
        >
          Previous
        </button>

        {current < questions.length - 1 ? (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            disabled={!answers[q.id]}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
            style={{ background: '#2d6a4f' }}
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
            style={{ background: '#2d6a4f' }}
          >
            {submitting ? 'Submitting...' : 'Submit assessment'}
          </button>
        )}
      </div>
    </div>
  )
}