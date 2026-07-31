'use client'

import { useEffect, useRef, useState } from 'react'
import { SaveChangesModal, type VersionSummary } from './SaveChangesModal'
import { VersionHistory } from './VersionHistory'
import { QuestionBankAccessPanel, type AccessSummary } from './QuestionBankAccessPanel'
import { findDuplicateOption } from '@/modules/assessment/schema'

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

interface WorkingSetItem {
  id:               string
  sourceQuestionId: string | null
  questionText:     string
  optionA:          string
  optionB:          string
  optionC:          string
  optionD:          string
  correctAnswer:    string
  isActive:         boolean
}

function computeDiff(original: WorkingSetItem[], current: WorkingSetItem[]) {
  const originalById = new Map(original.map((i) => [i.id, i]))
  let added = 0, archived = 0, restored = 0, edited = 0

  for (const item of current) {
    const orig = originalById.get(item.id)
    if (!orig) { added++; continue }
    if (orig.isActive && !item.isActive) { archived++; continue }
    if (!orig.isActive && item.isActive) { restored++; continue }
    if (
      orig.questionText  !== item.questionText  ||
      orig.optionA       !== item.optionA       ||
      orig.optionB       !== item.optionB       ||
      orig.optionC       !== item.optionC       ||
      orig.optionD       !== item.optionD       ||
      orig.correctAnswer !== item.correctAnswer
    ) edited++
  }

  return { added, archived, restored, edited }
}

export function QuestionBankDetail({ bankId }: { bankId: string }) {
  const [items,   setItems]   = useState<WorkingSetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const originalSnapshot = useRef<WorkingSetItem[]>([])

  // Unknown until the access panel resolves it — editing controls stay
  // hidden until then so a non-owner never briefly sees a button that
  // would just be rejected by the server.
  const [access, setAccess] = useState<AccessSummary | null>(null)
  const accessKnown = access !== null
  const canEdit      = access?.canEdit ?? false

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    questionText: '', optionA: '', optionB: '', optionC: '', optionD: '',
    correctAnswer: 'A' as 'A' | 'B' | 'C' | 'D',
  })
  const [addLoading, setAddLoading] = useState(false)
  const [addError,   setAddError]   = useState<string | null>(null)

  const [showArchived, setShowArchived] = useState(false)
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null)

  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [versions, setVersions] = useState<VersionSummary[]>([])
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError,   setSaveError]   = useState<string | null>(null)
  const [historyKey,  setHistoryKey]  = useState(0) // bump to refresh VersionHistory after a save
  const [isBaseVersionUsed, setIsBaseVersionUsed] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm,  setEditForm]  = useState({
    questionText: '', optionA: '', optionB: '', optionC: '', optionD: '',
    correctAnswer: 'A' as 'A' | 'B' | 'C' | 'D',
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError,   setEditError]   = useState<string | null>(null)

  async function loadWorkingSet() {
    setLoading(true)
    setLoadError(null)
    const res = await fetch(`/api/assessments/banks/${bankId}/working-set`)
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setLoadError(data.message ?? 'Failed to load questions')
      return
    }
    setItems(data.workingSet.items)
    originalSnapshot.current = data.workingSet.items
    setIsBaseVersionUsed(data.workingSet.isBaseVersionUsed)
  }

  useEffect(() => {
    loadWorkingSet()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankId])

  function handleAddClick(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)
    if (!form.questionText || !form.optionA || !form.optionB || !form.optionC || !form.optionD) {
      setAddError('All fields are required.')
      return
    }
    if (findDuplicateOption(form)) {
      setAddError('Options must all be different.')
      return
    }
    submitAdd()
  }

  async function submitAdd() {
    setAddLoading(true)
    setAddError(null)

    const res  = await fetch(`/api/assessments/banks/${bankId}/working-set/questions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    })
    const data = await res.json()
    setAddLoading(false)

    if (!res.ok) {
      setAddError(data.message ?? 'Failed to add question')
      return
    }

    setItems((prev) => [...prev, data.item])
    setForm({ questionText: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A' })
    setShowForm(false)
  }

  async function handleToggle(item: WorkingSetItem) {
    setToggleLoadingId(item.id)
    const res = await fetch(`/api/assessments/banks/${bankId}/working-set/questions/${item.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: item.isActive ? 'archive' : 'restore' }),
    })
    const data = await res.json()
    setToggleLoadingId(null)
    if (!res.ok) return

    setItems((prev) => prev.map((i) => (i.id === item.id ? data.item : i)))
  }

  async function handleDiscard(item: WorkingSetItem) {
    setToggleLoadingId(item.id)
    const res = await fetch(`/api/assessments/banks/${bankId}/working-set/questions/${item.id}`, {
      method: 'DELETE',
    })
    setToggleLoadingId(null)
    if (!res.ok) return

    setItems((prev) => prev.filter((i) => i.id !== item.id))
  }

  async function openSaveModal() {
    setSaveError(null)
    setSaveModalOpen(true)
    const res = await fetch(`/api/assessments/banks/${bankId}/versions`)
    const data = await res.json()
    if (res.ok) setVersions(data.versions)
  }

  async function handleSave(versionLabel: string, justification: string) {
    setSaveLoading(true)
    setSaveError(null)

    const res  = await fetch(`/api/assessments/banks/${bankId}/versions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ versionLabel, justification }),
    })
    const data = await res.json()
    setSaveLoading(false)

    if (!res.ok) {
      setSaveError(data.message ?? 'Failed to save version')
      return
    }

    setSaveModalOpen(false)
    setHistoryKey((k) => k + 1)
    await loadWorkingSet()
  }

  async function handleApplyDirectly(justification: string) {
    setSaveLoading(true)
    setSaveError(null)

    const res  = await fetch(`/api/assessments/banks/${bankId}/apply-changes`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ justification }),
    })
    const data = await res.json()
    setSaveLoading(false)

    if (!res.ok) {
      setSaveError(data.message ?? 'Failed to apply changes')
      return
    }

    setSaveModalOpen(false)
    await loadWorkingSet()
  }

  async function handleUsePreviousVersion(versionId: string) {
    setSaveLoading(true)
    setSaveError(null)

    const res  = await fetch(`/api/assessments/banks/${bankId}/working-set/rebase`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ baseVersionId: versionId }),
    })
    const data = await res.json()
    setSaveLoading(false)

    if (!res.ok) {
      setSaveError(data.message ?? 'Failed to switch version')
      return
    }

    setSaveModalOpen(false)
    setItems(data.workingSet.items)
    originalSnapshot.current = data.workingSet.items
    setIsBaseVersionUsed(data.workingSet.isBaseVersionUsed)
  }

  function startEdit(item: WorkingSetItem) {
    setEditingId(item.id)
    setEditForm({
      questionText: item.questionText, optionA: item.optionA, optionB: item.optionB,
      optionC: item.optionC, optionD: item.optionD, correctAnswer: item.correctAnswer as 'A' | 'B' | 'C' | 'D',
    })
    setEditError(null)
  }

  async function submitEdit() {
    if (!editingId) return
    setEditError(null)
    if (!editForm.questionText || !editForm.optionA || !editForm.optionB || !editForm.optionC || !editForm.optionD) {
      setEditError('All fields are required.')
      return
    }
    if (findDuplicateOption(editForm)) {
      setEditError('Options must all be different.')
      return
    }
    setEditLoading(true)

    const res  = await fetch(`/api/assessments/banks/${bankId}/working-set/questions/${editingId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(editForm),
    })
    const data = await res.json()
    setEditLoading(false)

    if (!res.ok) {
      setEditError(data.message ?? 'Failed to save changes')
      return
    }

    setItems((prev) => prev.map((i) => (i.id === editingId ? data.item : i)))
    setEditingId(null)
  }

  const activeCount   = items.filter((q) => q.isActive).length
  const archivedCount = items.filter((q) => !q.isActive).length
  const visibleItems  = items.filter((q) => q.isActive !== showArchived)
  const diff = computeDiff(originalSnapshot.current, items)
  const hasStagedChanges = diff.added + diff.archived + diff.restored + diff.edited > 0

  const inputClass = "w-full px-3 py-2 rounded-lg border text-sm outline-none"
  const inputStyle = { borderColor: '#d1d5db' }

  if (loading) {
    return <div className="bg-white rounded-2xl border p-6 text-sm text-gray-400" style={{ borderColor: '#e5e7eb' }}>Loading questions...</div>
  }
  if (loadError) {
    return <div className="bg-white rounded-2xl border p-6 text-sm" style={{ borderColor: '#e5e7eb', color: '#dc2626' }}>{loadError}</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <QuestionBankAccessPanel bankId={bankId} onAccessChange={setAccess} />

      {accessKnown && !canEdit && (
        <div className="px-4 py-3 rounded-2xl text-sm flex items-center gap-2" style={{ background: '#fffbeb', color: '#92400e' }}>
          <LockIcon />
          {access?.ownerName} has not granted you access to add or edit questions in this question bank.
        </div>
      )}

      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Questions ({activeCount} active, {archivedCount} archived)
            {hasStagedChanges && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#fefce8', color: '#a16207' }}>
                Unsaved changes
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              Show archived
            </label>
            {canEdit && (
              <>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                  style={{ background: '#2d6a4f' }}
                >
                  {showForm ? 'Cancel' : '+ Add question'}
                </button>
                <button
                  onClick={openSaveModal}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40"
                  style={{ background: '#1d4ed8' }}
                >
                  Save changes
                </button>
              </>
            )}
            {accessKnown && !canEdit && (
              <>
                <button
                  disabled
                  title={`${access?.ownerName} has not granted you access to add questions`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-not-allowed"
                  style={{ background: '#f3f4f6', color: '#9ca3af' }}
                >
                  <LockIcon />
                  Add question
                </button>
                <button
                  disabled
                  title={`${access?.ownerName} has not granted you access to edit this question bank`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-not-allowed"
                  style={{ background: '#f3f4f6', color: '#9ca3af' }}
                >
                  <LockIcon />
                  Save changes
                </button>
              </>
            )}
          </div>
        </div>

        {/* Add question form — staged only, nothing written until Save Changes */}
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

            {addError && (
              <div className="text-sm px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>
                {addError}
              </div>
            )}

            <button
              type="submit"
              disabled={addLoading}
              className="self-end px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#2d6a4f' }}
            >
              {addLoading ? 'Adding...' : 'Add question'}
            </button>
          </form>
        )}

        {/* Question list */}
        {visibleItems.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            {showArchived ? 'No archived questions' : 'No questions added yet'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleItems.map((q, i) => (
              <div
                key={q.id}
                className="p-3 rounded-lg border"
                style={{ borderColor: '#f3f4f6', background: q.isActive ? '#fff' : '#f9fafb' }}
              >
                {editingId === q.id ? (
                  <div className="flex flex-col gap-3">
                    <textarea
                      value={editForm.questionText}
                      onChange={(e) => setEditForm({ ...editForm, questionText: e.target.value })}
                      rows={2}
                      className={inputClass}
                      style={inputStyle}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                        <div key={opt} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`edit-correct-${q.id}`}
                            checked={editForm.correctAnswer === opt}
                            onChange={() => setEditForm({ ...editForm, correctAnswer: opt })}
                            className="accent-green-700"
                          />
                          <input
                            value={editForm[`option${opt}` as 'optionA']}
                            onChange={(e) => setEditForm({ ...editForm, [`option${opt}`]: e.target.value })}
                            className={inputClass}
                            style={inputStyle}
                          />
                        </div>
                      ))}
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
                        disabled={editLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                        style={{ background: '#2d6a4f' }}
                      >
                        {editLoading ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {i + 1}. {q.questionText}
                        {!q.sourceQuestionId && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: '#f0fdf4', color: '#166534' }}>new</span>
                        )}
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
                    {canEdit && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!q.sourceQuestionId && (
                          <button
                            onClick={() => handleDiscard(q)}
                            disabled={toggleLoadingId === q.id}
                            className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                            style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
                          >
                            Discard
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(q)}
                          className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                          style={{ borderColor: '#e5e7eb', color: '#374151' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggle(q)}
                          disabled={toggleLoadingId === q.id}
                          className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                          style={
                            q.isActive
                              ? { borderColor: '#fecaca', color: '#dc2626' }
                              : { borderColor: '#bbf7d0', color: '#166534' }
                          }
                        >
                          {q.isActive ? 'Archive' : 'Restore'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <VersionHistory key={historyKey} bankId={bankId} />

      <SaveChangesModal
        isOpen={saveModalOpen}
        diff={diff}
        versions={versions}
        isBaseVersionUsed={isBaseVersionUsed}
        onSave={handleSave}
        onApplyDirectly={handleApplyDirectly}
        onUsePreviousVersion={handleUsePreviousVersion}
        onCancel={() => setSaveModalOpen(false)}
        loading={saveLoading}
        error={saveError}
      />
    </div>
  )
}
