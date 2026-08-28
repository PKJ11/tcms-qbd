'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'
import { WorkDraftBanner } from '@/components/WorkDraftBanner'
import { useWorkDraft } from '@/hooks/useWorkDraft'
import { TOPIC_NEW_DRAFT_KEY, TOPIC_NEW_DRAFT_SCHEMA } from '@/lib/work-drafts'
import { TOPIC_TYPE_INFO } from './status'

interface Section    { id: string; name: string; code: string }
interface Unit       { id: string; name: string; sections: Section[] }
interface Department { id: string; name: string; code: string; units: Unit[] }

interface Scope {
  departmentId: string
  unitId?:      string
  sectionId?:   string
}

interface Props {
  departments: Department[]
}

// Compulsory-scope targeting (department/unit/section) is not part of the
// current business requirement. The builder UI stays in place, just hidden,
// so it can be switched back on later without rebuilding it.
const SHOW_COMPULSORY_SCOPES = false

const TRAINING_TYPES = (Object.keys(TOPIC_TYPE_INFO) as (keyof typeof TOPIC_TYPE_INFO)[]).map((value) => ({
  value,
  label:       TOPIC_TYPE_INFO[value].label,
  description: TOPIC_TYPE_INFO[value].description,
  steps:       TOPIC_TYPE_INFO[value].steps,
}))

export function CreateTopicForm({ departments }: Props) {
  const router = useRouter()

  const [name,         setName]         = useState('')
  const [description,  setDescription]  = useState('')
  const [sopReference, setSopReference] = useState('')
  const [trainingType, setTrainingType] = useState('MATERIAL_MCQ')
  const [scopes,       setScopes]       = useState<Scope[]>([])

  const [builderDeptId,    setBuilderDeptId]    = useState('')
  const [builderUnitId,    setBuilderUnitId]    = useState('')
  const [builderSectionId, setBuilderSectionId] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  interface TopicDraft {
    name:            string
    description:     string
    sopReference:    string
    trainingType:    string
    scopes:          Scope[]
    builderDeptId:   string
    builderUnitId:   string
    builderSectionId: string
  }

  const draft = useWorkDraft<TopicDraft>(TOPIC_NEW_DRAFT_KEY, {
    routePath:     '/topics/new',
    schemaVersion: TOPIC_NEW_DRAFT_SCHEMA,
    watch:         [name, description, sopReference, trainingType, scopes,
                    builderDeptId, builderUnitId, builderSectionId],
    snapshot: () => ({
      name, description, sopReference, trainingType, scopes,
      builderDeptId, builderUnitId, builderSectionId,
    }),
    isEmpty: (s) =>
      !s.name?.trim() && !s.description?.trim() && !s.sopReference?.trim() &&
      (s.scopes?.length ?? 0) === 0,
    onRestore: (s) => {
      setName(s.name ?? '')
      setDescription(s.description ?? '')
      setSopReference(s.sopReference ?? '')
      setTrainingType(s.trainingType ?? 'MATERIAL_MCQ')
      setScopes(s.scopes ?? [])
      setBuilderDeptId(s.builderDeptId ?? '')
      setBuilderUnitId(s.builderUnitId ?? '')
      setBuilderSectionId(s.builderSectionId ?? '')
    },
  })

  const builderDept  = departments.find((d) => d.id === builderDeptId)
  const builderUnits = builderDept?.units ?? []
  const builderUnit  = builderUnits.find((u) => u.id === builderUnitId)
  const builderSections = builderUnit?.sections ?? []

  function scopeLabel(scope: Scope): string {
    const dept = departments.find((d) => d.id === scope.departmentId)
    if (!dept) return 'Unknown'
    const unit = dept.units.find((u) => u.id === scope.unitId)
    if (!unit) return dept.name
    const section = unit.sections.find((s) => s.id === scope.sectionId)
    if (!section) return `${dept.name} → ${unit.name}`
    return `${dept.name} → ${unit.name} → ${section.name}`
  }

  function addScope() {
    if (!builderDeptId) return
    const candidate: Scope = {
      departmentId: builderDeptId,
      unitId:       builderUnitId    || undefined,
      sectionId:    builderSectionId || undefined,
    }
    const isDuplicate = scopes.some(
      (s) => s.departmentId === candidate.departmentId &&
             s.unitId       === candidate.unitId &&
             s.sectionId    === candidate.sectionId
    )
    if (!isDuplicate) setScopes((prev) => [...prev, candidate])
    setBuilderDeptId('')
    setBuilderUnitId('')
    setBuilderSectionId('')
  }

  function removeScope(index: number) {
    setScopes((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Topic name is required.')
      return
    }

    if (trainingType === 'ACKNOWLEDGEMENT_ONLY' && !description.trim()) {
      setError('Write the "Read & understood" statement in the Description field — it is required for acknowledgement-only training.')
      return
    }

    setModalOpen(true)
  }

  async function handleConfirm(justification: string) {
    setModalOpen(false)
    setLoading(true)
    setError(null)

    const res = await fetch('/api/topics', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name:         name.trim(),
        description:  description.trim() || undefined,
        sopReference: sopReference.trim() || undefined,
        trainingType,
        scopes,
        justification,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.message ?? 'Failed to create topic.')
      return
    }

    draft.clear()
    router.push(`/topics/${data.topic.id}`)
    router.refresh()
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
  const inputStyle = { borderColor: '#d1d5db', background: '#fff' }

  return (
    <>
      {draft.pendingDraft && (
        <WorkDraftBanner
          summary={`a draft topic${draft.pendingDraft.payload.name ? ` — "${draft.pendingDraft.payload.name}"` : ''}`}
          updatedAt={draft.pendingDraft.updatedAt}
          onRestore={draft.restore}
          onDiscard={draft.discard}
        />
      )}

      <div
        className="bg-white rounded-2xl border p-6"
        style={{ borderColor: '#e5e7eb' }}
      >
        <form onSubmit={handleSubmitClick} className="flex flex-col gap-5">

          {/* Topic name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Topic name <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HPLC Operation Basics"
              className={inputClass}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#2d6a4f'}
              onBlur={(e)  => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {trainingType === 'ACKNOWLEDGEMENT_ONLY' ? 'Read & understood statement' : 'Description'}
              {trainingType === 'ACKNOWLEDGEMENT_ONLY' ? (
                <span className="text-red-500 ml-1">*</span>
              ) : (
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              )}
            </label>
            {trainingType === 'ACKNOWLEDGEMENT_ONLY' && (
              <p className="text-xs text-gray-400 mb-1.5">
                This is what the trainee will read and confirm they have understood — e.g. the
                SOP, policy, or instruction they must acknowledge.
              </p>
            )}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                trainingType === 'ACKNOWLEDGEMENT_ONLY'
                  ? 'e.g. "I confirm I have read and understood SOP QbD/QA/001 on Change Control."'
                  : 'Brief description of what this topic covers...'
              }
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all resize-none"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#2d6a4f'}
              onBlur={(e)  => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          {/* SOP reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              SOP number and version <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <p className="text-xs text-gray-400 mb-1.5">
              The governing SOP this training covers — shown under the topic name on the Training Matrix report.
            </p>
            <input
              type="text"
              value={sopReference}
              onChange={(e) => setSopReference(e.target.value)}
              placeholder="e.g. QbD-QC-SOP-067, Ver.No. 04"
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#2d6a4f'}
              onBlur={(e)  => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          {/* Training type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Training type <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-2">
              {TRAINING_TYPES.map((t) => (
                <label
                  key={t.value}
                  className="flex items-start gap-3 px-4 py-2.5 rounded-lg border cursor-pointer"
                  style={{
                    borderColor: trainingType === t.value ? '#2d6a4f' : '#e5e7eb',
                    background:  trainingType === t.value ? '#f0fdf4' : '#fff',
                  }}
                >
                  <input
                    type="radio"
                    name="trainingType"
                    checked={trainingType === t.value}
                    onChange={() => setTrainingType(t.value)}
                    className="w-4 h-4 mt-0.5 accent-green-700"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-800">{t.label}</div>
                    <div className="text-xs text-gray-500">{t.description}</div>
                    {trainingType === t.value && (
                      <ul className="mt-2 flex flex-col gap-1">
                        {t.steps.map((step, i) => (
                          <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                            <span
                              className="flex-shrink-0 w-4 h-4 rounded-full text-[10px] font-semibold flex items-center justify-center mt-0.5"
                              style={{ background: '#dcfce7', color: '#166534' }}
                            >
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Compulsory scope builder — hidden for now, not a current business requirement */}
          {SHOW_COMPULSORY_SCOPES && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Make this training compulsory for specific teams
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Leave this empty if nobody needs to be auto-enrolled. Otherwise, pick a
              Department below and everyone in it will be required to complete this
              training — including people who join later. To cover a smaller group,
              also pick a Unit, or a Unit and a Section.
            </p>

            <div className="rounded-xl border p-4 mb-3" style={{ borderColor: '#e5e7eb', background: '#fafafa' }}>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    1. Department
                  </label>
                  <select
                    value={builderDeptId}
                    onChange={(e) => {
                      setBuilderDeptId(e.target.value)
                      setBuilderUnitId('')
                      setBuilderSectionId('')
                    }}
                    className={inputClass}
                    style={{ ...inputStyle, background: '#fff' }}
                  >
                    <option value="">Choose a department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    2. Unit
                    <span className="text-gray-400 font-normal ml-1">
                      — optional, only to narrow it down
                    </span>
                  </label>
                  <select
                    value={builderUnitId}
                    onChange={(e) => {
                      setBuilderUnitId(e.target.value)
                      setBuilderSectionId('')
                    }}
                    disabled={builderUnits.length === 0}
                    className={inputClass}
                    style={{ ...inputStyle, background: '#fff', opacity: builderUnits.length === 0 ? 0.5 : 1 }}
                  >
                    <option value="">
                      {builderDeptId ? 'Apply to the whole department' : 'Choose a department first'}
                    </option>
                    {builderUnits.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    3. Section
                    <span className="text-gray-400 font-normal ml-1">
                      — optional, only to narrow it down further
                    </span>
                  </label>
                  <select
                    value={builderSectionId}
                    onChange={(e) => setBuilderSectionId(e.target.value)}
                    disabled={builderSections.length === 0}
                    className={inputClass}
                    style={{ ...inputStyle, background: '#fff', opacity: builderSections.length === 0 ? 0.5 : 1 }}
                  >
                    <option value="">
                      {builderUnitId ? 'Apply to the whole unit' : 'Choose a unit first'}
                    </option>
                    {builderSections.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={addScope}
                disabled={!builderDeptId}
                className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                style={{
                  borderColor: '#2d6a4f',
                  color:       '#2d6a4f',
                  background:  '#fff',
                  opacity:     !builderDeptId ? 0.5 : 1,
                }}
              >
                + Add this group to the list below
              </button>
            </div>

            {scopes.length === 0 ? (
              <p className="text-xs text-gray-400">
                No groups added yet — this topic won't be automatically assigned to anyone.
              </p>
            ) : (
              <>
                <p className="text-xs font-medium text-gray-600 mb-1.5">
                  This training will be compulsory for:
                </p>
                <div className="flex flex-col gap-2">
                  {scopes.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border"
                      style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" className="flex-shrink-0">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        <span className="text-sm font-medium truncate" style={{ color: '#166534' }}>
                          {scopeLabel(s)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeScope(i)}
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors"
                        style={{ borderColor: '#fecaca', color: '#dc2626', background: '#fff' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="text-sm px-4 py-3 rounded-lg border"
              style={{
                background:  '#fef2f2',
                borderColor: '#fecaca',
                color:       '#dc2626',
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <a
              href="/topics"
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
              {loading ? 'Creating...' : 'Create topic'}
            </button>
          </div>
        </form>
      </div>

      <JustificationModal
        isOpen={modalOpen}
        title="Confirm topic creation"
        description={`Creating topic "${name}".`}
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        loading={loading}
      />
    </>
  )
}
