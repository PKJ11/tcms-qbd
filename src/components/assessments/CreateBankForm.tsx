'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'
import { WorkDraftBanner } from '@/components/WorkDraftBanner'
import { useWorkDraft } from '@/hooks/useWorkDraft'
import { BANK_NEW_DRAFT_KEY, BANK_NEW_DRAFT_SCHEMA } from '@/lib/work-drafts'
import { validateOptionSet, filledOptions, OPTION_LETTERS } from '@/modules/assessment/schema'
import { QUESTIONS_PER_ATTEMPT } from '@/modules/assessment/constants'

interface Topic { id: string; name: string }

interface Props {
  topics:          Topic[]
  initialTopicId?: string
}

interface StagedQuestion {
  localId:       string
  questionText:  string
  optionA:       string
  optionB:       string
  optionC:       string
  optionD:       string
  correctAnswer: 'A' | 'B' | 'C' | 'D'
}

const emptyQuestionForm = {
  questionText: '', optionA: '', optionB: '', optionC: '', optionD: '',
  correctAnswer: 'A' as 'A' | 'B' | 'C' | 'D',
}

type QuestionForm = typeof emptyQuestionForm

function questionFormIsEmpty(f: QuestionForm): boolean {
  return !f.questionText.trim() && !f.optionA.trim() && !f.optionB.trim()
      && !f.optionC.trim() && !f.optionD.trim()
}

interface BankNewDraft {
  topicId:    string
  questions:  StagedQuestion[]
  showForm:   boolean
  form:       QuestionForm
  editingId:  string | null
  editForm:   QuestionForm
  scrollY:    number
}

// A question bank is never created empty — the trainer builds the question
// list here first (nothing is saved yet), and a single "Save changes" click
// creates the bank together with version 1.0 and these questions, all at
// once. Cancel or navigate away before that and nothing is ever persisted.
export function CreateBankForm({ topics, initialTopicId }: Props) {
  const router = useRouter()
  const nextLocalId = useRef(1)

  const hasInitialTopic = !!initialTopicId && topics.some((t) => t.id === initialTopicId)

  const [topicId, setTopicId] = useState(hasInitialTopic ? initialTopicId! : '')
  const [questions, setQuestions] = useState<StagedQuestion[]>([])

  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(emptyQuestionForm)
  const [formError, setFormError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm,  setEditForm]  = useState(emptyQuestionForm)
  const [editError, setEditError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Autosave in-progress staging so an idle/manual logout doesn't discard it.
  // Nothing here is a record — restoring only re-fills the form; the trainer
  // still goes through Save + justification.
  const draft = useWorkDraft<BankNewDraft>(BANK_NEW_DRAFT_KEY, {
    routePath:     '/assessments/banks/new',
    schemaVersion: BANK_NEW_DRAFT_SCHEMA,
    watch:         [topicId, questions, showForm, form, editingId, editForm],
    snapshot: () => ({
      topicId, questions, showForm, form, editingId, editForm,
      scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
    }),
    isEmpty: (s) => s.questions.length === 0 && questionFormIsEmpty(s.form),
    onRestore: (s) => {
      if (!hasInitialTopic && typeof s.topicId === 'string') setTopicId(s.topicId)
      setQuestions(s.questions ?? [])
      setShowForm(s.showForm ?? false)
      setForm(s.form ?? emptyQuestionForm)
      setEditingId(s.editingId ?? null)
      setEditForm(s.editForm ?? emptyQuestionForm)
      const maxLocalId = (s.questions ?? []).reduce(
        (m, q) => Math.max(m, Number(q.localId) || 0), 0,
      )
      nextLocalId.current = maxLocalId + 1
      if (typeof s.scrollY === 'number') {
        requestAnimationFrame(() => window.scrollTo(0, s.scrollY))
      }
    },
  })

  function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.questionText) {
      setFormError('Question text is required.')
      return
    }
    const optionError = validateOptionSet(form)
    if (optionError) {
      setFormError(optionError)
      return
    }
    setQuestions((prev) => [...prev, { localId: String(nextLocalId.current++), ...form }])
    setForm(emptyQuestionForm)
    setShowForm(false)
  }

  function startEdit(q: StagedQuestion) {
    setEditingId(q.localId)
    setEditForm({
      questionText: q.questionText, optionA: q.optionA, optionB: q.optionB,
      optionC: q.optionC, optionD: q.optionD, correctAnswer: q.correctAnswer,
    })
    setEditError(null)
  }

  function submitEdit() {
    if (!editingId) return
    setEditError(null)
    if (!editForm.questionText) {
      setEditError('Question text is required.')
      return
    }
    const optionError = validateOptionSet(editForm)
    if (optionError) {
      setEditError(optionError)
      return
    }
    setQuestions((prev) => prev.map((q) => (q.localId === editingId ? { ...q, ...editForm } : q)))
    setEditingId(null)
  }

  function removeQuestion(localId: string) {
    setQuestions((prev) => prev.filter((q) => q.localId !== localId))
  }

  function handleSaveClick() {
    setError(null)
    if (!topicId) {
      setError('Please select a topic.')
      return
    }
    if (questions.length < QUESTIONS_PER_ATTEMPT) {
      setError(`Add at least ${QUESTIONS_PER_ATTEMPT} questions before saving.`)
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
      body:    JSON.stringify({
        topicId,
        questions: questions.map((q) => ({
          questionText:  q.questionText,
          optionA:       q.optionA,
          optionB:       q.optionB,
          optionC:       q.optionC,
          optionD:       q.optionD,
          correctAnswer: q.correctAnswer,
        })),
        justification,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.message ?? 'Failed to save questions')
      return
    }

    draft.clear()
    router.push(`/assessments/banks/${data.bank.id}`)
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
  const inputStyle = { borderColor: '#d1d5db' }
  const smallInputClass = "w-full px-3 py-2 rounded-lg border text-sm outline-none"

  return (
    <>
      {draft.pendingDraft && (
        <WorkDraftBanner
          summary={`${draft.pendingDraft.payload.questions?.length ?? 0} question${
            (draft.pendingDraft.payload.questions?.length ?? 0) === 1 ? '' : 's'
          } staged`}
          updatedAt={draft.pendingDraft.updatedAt}
          onRestore={draft.restore}
          onDiscard={draft.discard}
        />
      )}

      <div className="bg-white rounded-2xl border p-6 mb-4" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex flex-col gap-5">

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Topic <span className="text-red-500">*</span>
            </label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              disabled={hasInitialTopic}
              className={inputClass}
              style={inputStyle}
            >
              <option value="">Select topic without existing questions</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {topics.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                All topics already have assessment questions.
              </p>
            )}
          </div>

          {/* MCQ settings — fixed by SOP, not configurable */}
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg border text-sm text-gray-600" style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
            Every assessment uses the SOP-fixed settings: <strong>80%</strong> pass mark, <strong>5</strong> questions per attempt, <strong>3</strong> max attempts.
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-gray-700">
            Questions ({questions.length})
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#fefce8', color: '#a16207' }}>
              Nothing saved yet
            </span>
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ background: '#2d6a4f' }}
          >
            {showForm ? 'Cancel' : '+ Add question'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          At least {QUESTIONS_PER_ATTEMPT} questions are required before saving.
        </p>

        {showForm && (
          <form onSubmit={handleAddQuestion} className="flex flex-col gap-3 mb-6 p-4 rounded-lg" style={{ background: '#fafafa' }}>
            <textarea
              placeholder="Question text"
              value={form.questionText}
              onChange={(e) => setForm({ ...form, questionText: e.target.value })}
              rows={2}
              className={smallInputClass}
              style={inputStyle}
            />
            <div className="grid grid-cols-2 gap-3">
              {OPTION_LETTERS.map((opt) => {
                const optional = opt === 'C' || opt === 'D'
                const filled   = !!form[`option${opt}` as 'optionA'].trim()
                return (
                  <div key={opt} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct"
                      checked={form.correctAnswer === opt}
                      disabled={optional && !filled}
                      onChange={() => setForm({ ...form, correctAnswer: opt })}
                      className="accent-green-700"
                    />
                    <input
                      placeholder={optional ? `Option ${opt} (optional)` : `Option ${opt}`}
                      value={form[`option${opt}` as 'optionA']}
                      onChange={(e) => setForm({ ...form, [`option${opt}`]: e.target.value })}
                      className={smallInputClass}
                      style={inputStyle}
                    />
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400">
              Select the radio button next to the correct answer. Option A and B are required —
              leave C and/or D blank for a 2 or 3-option question.
            </p>

            {formError && (
              <div className="text-sm px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>
                {formError}
              </div>
            )}

            <button
              type="submit"
              className="self-end px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#2d6a4f' }}
            >
              Add question
            </button>
          </form>
        )}

        {questions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No questions added yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {questions.map((q, i) => (
              <div
                key={q.localId}
                className="p-3 rounded-lg border"
                style={{ borderColor: '#f3f4f6', background: '#fff' }}
              >
                {editingId === q.localId ? (
                  <div className="flex flex-col gap-3">
                    <textarea
                      value={editForm.questionText}
                      onChange={(e) => setEditForm({ ...editForm, questionText: e.target.value })}
                      rows={2}
                      className={smallInputClass}
                      style={inputStyle}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      {OPTION_LETTERS.map((opt) => {
                        const optional = opt === 'C' || opt === 'D'
                        const filled   = !!editForm[`option${opt}` as 'optionA'].trim()
                        return (
                          <div key={opt} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`edit-correct-${q.localId}`}
                              checked={editForm.correctAnswer === opt}
                              disabled={optional && !filled}
                              onChange={() => setEditForm({ ...editForm, correctAnswer: opt })}
                              className="accent-green-700"
                            />
                            <input
                              placeholder={optional ? `Option ${opt} (optional)` : `Option ${opt}`}
                              value={editForm[`option${opt}` as 'optionA']}
                              onChange={(e) => setEditForm({ ...editForm, [`option${opt}`]: e.target.value })}
                              className={smallInputClass}
                              style={inputStyle}
                            />
                          </div>
                        )
                      })}
                    </div>
                    {editError && (
                      <div className="text-sm px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>
                        {editError}
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                        style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitEdit}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                        style={{ background: '#2d6a4f' }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {i + 1}. {q.questionText}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                        {filledOptions(q).map(({ letter, text }) => (
                          <div
                            key={letter}
                            className={q.correctAnswer === letter ? 'font-semibold' : ''}
                            style={{ color: q.correctAnswer === letter ? '#166534' : undefined }}
                          >
                            {letter}. {text}
                            {q.correctAnswer === letter && ' ✓'}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => removeQuestion(q.localId)}
                        className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                        style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => startEdit(q)}
                        className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                        style={{ borderColor: '#e5e7eb', color: '#374151' }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div
            className="text-sm px-4 py-3 rounded-lg border mt-4"
            style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 mt-2" style={{ borderTop: '1px solid #f3f4f6' }}>
          <a
            href="/assessments"
            className="px-4 py-2 rounded-lg text-sm border font-medium"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}
          >
            Cancel
          </a>
          <button
            onClick={handleSaveClick}
            disabled={loading || questions.length < QUESTIONS_PER_ATTEMPT || !topicId}
            title={questions.length < QUESTIONS_PER_ATTEMPT ? `Add at least ${QUESTIONS_PER_ATTEMPT} questions first` : undefined}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: questions.length < QUESTIONS_PER_ATTEMPT || !topicId ? '#9ca3af' : '#2d6a4f' }}
          >
            {loading ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>

      <JustificationModal
        isOpen={modalOpen}
        title="Confirm assessment questions creation"
        description={`This saves ${questions.length} question${questions.length === 1 ? '' : 's'} as version 1.0 — SOP-fixed 80% pass mark, 5 questions per attempt, 3 max attempts.`}
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        loading={loading}
      />
    </>
  )
}
