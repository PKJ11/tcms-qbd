'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'

interface Section    { id: string; name: string }
interface Unit       { id: string; name: string; sections: Section[] }
interface Department { id: string; name: string; units: Unit[] }

interface Scope {
  departmentId: string
  unitId?:      string
  sectionId?:   string
}

interface Topic {
  id:           string
  name:         string
  isActive:     boolean
  trainingType: string
  topicScopes: {
    department: { id: string; name: string }
    unit:       { id: string; name: string } | null
    section:    { id: string; name: string } | null
  }[]
}

interface Props {
  topic:       Topic
  departments: Department[]
}

const TRAINING_TYPES: { value: string; label: string }[] = [
  { value: 'MATERIAL_MCQ',          label: 'Material + MCQ Assessment' },
  { value: 'MATERIAL_ONLY',         label: 'Material Only' },
  { value: 'ACKNOWLEDGEMENT_ONLY',  label: 'Acknowledgement Only' },
]

type ActionType = 'deactivate' | 'edit-scopes' | null

export function TopicDetailView({ topic, departments }: Props) {
  const router = useRouter()

  const [action,       setAction]       = useState<ActionType>(null)
  const [scopes,       setScopes]       = useState<Scope[]>(
    topic.topicScopes.map((ts) => ({
      departmentId: ts.department.id,
      unitId:       ts.unit?.id,
      sectionId:    ts.section?.id,
    }))
  )
  const [trainingType, setTrainingType] = useState(topic.trainingType)
  const [modalLoading, setModalLoading] = useState(false)
  const [result,       setResult]       = useState<string | null>(null)

  const [builderDeptId,    setBuilderDeptId]    = useState('')
  const [builderUnitId,    setBuilderUnitId]    = useState('')
  const [builderSectionId, setBuilderSectionId] = useState('')

  const builderDept     = departments.find((d) => d.id === builderDeptId)
  const builderUnits    = builderDept?.units ?? []
  const builderUnit     = builderUnits.find((u) => u.id === builderUnitId)
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

  async function handleConfirm(justification: string) {
    if (!action) return
    setModalLoading(true)

    const body =
      action === 'deactivate'
        ? { action: 'deactivate', justification }
        : { scopes, trainingType, justification }

    const res = await fetch(`/api/topics/${topic.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })

    const data = await res.json()
    setModalLoading(false)
    setAction(null)

    if (!res.ok) {
      setResult(`Error: ${data.message}`)
      return
    }

    if (action === 'deactivate') {
      router.push('/topics')
    } else {
      setResult('Topic updated successfully.')
      router.refresh()
    }
  }

  const inputClass = "w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all"
  const inputStyle = { borderColor: '#d1d5db', background: '#fff' }

  return (
    <>
      <div
        className="bg-white rounded-xl border p-5"
        style={{ borderColor: '#e5e7eb' }}
      >
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Actions</h2>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setAction('edit-scopes')}
            className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}
          >
            Edit scope &amp; training type
          </button>

          {topic.isActive && (
            <button
              onClick={() => setAction('deactivate')}
              className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
              style={{ borderColor: '#fecaca', color: '#dc2626' }}
            >
              Deactivate topic
            </button>
          )}
        </div>

        {result && (
          <div
            className="mt-4 text-sm px-4 py-3 rounded-lg border"
            style={{
              background:  '#f0fdf4',
              borderColor: '#bbf7d0',
              color:       '#166534',
            }}
          >
            {result}
          </div>
        )}
      </div>

      {/* Deactivate modal */}
      <JustificationModal
        isOpen={action === 'deactivate'}
        title={`Deactivate "${topic.name}"`}
        description="This topic will no longer be assignable. Existing assignments are not affected."
        onConfirm={handleConfirm}
        onCancel={() => setAction(null)}
        loading={modalLoading}
      />

      {/* Edit scope + training type modal */}
      {action === 'edit-scopes' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-xl"
            style={{ border: '1px solid #e5e7eb' }}
          >
            <div
              className="px-6 pt-6 pb-4"
              style={{ borderBottom: '1px solid #f3f4f6' }}
            >
              <h3 className="text-base font-semibold text-gray-900">
                Edit scope &amp; training type
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Change who this training is compulsory for and how it's completed.
              </p>
            </div>

            <div className="px-6 py-4 max-h-96 overflow-y-auto flex flex-col gap-4">
              {/* Training type */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Training type
                </label>
                <select
                  value={trainingType}
                  onChange={(e) => setTrainingType(e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                >
                  {TRAINING_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Scope builder */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Compulsory for
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <select
                    value={builderDeptId}
                    onChange={(e) => {
                      setBuilderDeptId(e.target.value)
                      setBuilderUnitId('')
                      setBuilderSectionId('')
                    }}
                    className={inputClass}
                    style={inputStyle}
                  >
                    <option value="">Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <select
                    value={builderUnitId}
                    onChange={(e) => {
                      setBuilderUnitId(e.target.value)
                      setBuilderSectionId('')
                    }}
                    disabled={builderUnits.length === 0}
                    className={inputClass}
                    style={{ ...inputStyle, opacity: builderUnits.length === 0 ? 0.5 : 1 }}
                  >
                    <option value="">Whole dept.</option>
                    {builderUnits.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <select
                    value={builderSectionId}
                    onChange={(e) => setBuilderSectionId(e.target.value)}
                    disabled={builderSections.length === 0}
                    className={inputClass}
                    style={{ ...inputStyle, opacity: builderSections.length === 0 ? 0.5 : 1 }}
                  >
                    <option value="">Whole unit</option>
                    {builderSections.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={addScope}
                  disabled={!builderDeptId}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                  style={{ borderColor: '#2d6a4f', color: '#2d6a4f', opacity: !builderDeptId ? 0.5 : 1 }}
                >
                  + Add scope
                </button>

                <div className="flex flex-wrap gap-2 mt-3">
                  {scopes.map((s, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: '#f0fdf4', color: '#166534' }}
                    >
                      {scopeLabel(s)}
                      <button
                        type="button"
                        onClick={() => removeScope(i)}
                        className="text-green-700 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderTop: '1px solid #f3f4f6' }}
            >
              <span className="text-xs text-gray-400">
                {scopes.length} scope(s)
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setAction(null)}
                  className="px-4 py-2 rounded-lg border text-sm font-medium"
                  style={{ borderColor: '#e5e7eb', color: '#374151' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (scopes.length === 0) return
                    handleConfirm('Updated scope/training type for topic')
                  }}
                  disabled={scopes.length === 0}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: scopes.length === 0 ? '#9ca3af' : '#2d6a4f' }}
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
