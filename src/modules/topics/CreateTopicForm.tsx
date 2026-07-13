'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'

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

const TRAINING_TYPES: { value: string; label: string; description: string }[] = [
  {
    value:       'MATERIAL_MCQ',
    label:       'Material + MCQ Assessment',
    description: 'Training completes only after the assessment/test is completed.',
  },
  {
    value:       'MATERIAL_ONLY',
    label:       'Material Only',
    description: 'Training is completed when the material has been opened/read.',
  },
  {
    value:       'ACKNOWLEDGEMENT_ONLY',
    label:       'Acknowledgement Only',
    description: 'User completes the training by clicking the acknowledgement button.',
  },
]

export function CreateTopicForm({ departments }: Props) {
  const router = useRouter()

  const [name,         setName]         = useState('')
  const [description,  setDescription]  = useState('')
  const [trainingType, setTrainingType] = useState('MATERIAL_MCQ')
  const [scopes,       setScopes]       = useState<Scope[]>([])

  const [builderDeptId,    setBuilderDeptId]    = useState('')
  const [builderUnitId,    setBuilderUnitId]    = useState('')
  const [builderSectionId, setBuilderSectionId] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

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

    router.push('/topics')
    router.refresh()
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
              Description
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this topic covers..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all resize-none"
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
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Compulsory scope builder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Compulsory for <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Add a Department, or narrow it to a Unit or a specific Section. Add as many
              scopes as needed — this drives who this training is compulsory for.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-3">
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
                <option value="">Select department</option>
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
                <option value="">Whole department</option>
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
              style={{
                borderColor: '#2d6a4f',
                color:       '#2d6a4f',
                opacity:     !builderDeptId ? 0.5 : 1,
              }}
            >
              + Add scope
            </button>

            {scopes.length > 0 && (
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
            )}
          </div>

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
        description={`Creating topic "${name}" with ${scopes.length} compulsory scope(s).`}
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        loading={loading}
      />
    </>
  )
}
