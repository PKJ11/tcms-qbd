'use client'

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { JustificationModal }  from '@/components/JustificationModal'

interface Topic   { id: string; name: string }
interface Section { id: string; name: string }
interface Unit    { id: string; name: string; sections: Section[] }
interface Department {
  id:       string
  name:     string
  code:     string
  units:    Unit[]
  _count?:  { persons: number }
}
interface Person {
  id: string; name: string; employeeId: string; designation: string; roles: string[]
  department: { id: string; name: string } | null
}

interface Props {
  topics:          Topic[]
  initialTopicId?: string
}

const TRIGGERS = [
  { value: 'INDUCTION',  label: 'Induction',        description: 'New joiner training — auto-assigned on joining' },
  { value: 'UPGRADE',    label: 'Role upgrade',      description: "Person's responsibilities have changed" },
  { value: 'RETRAINING', label: 'Retraining',        description: 'Performance or deviation-driven retraining' },
  { value: 'REFRESHER',  label: 'Refresher',         description: 'Scheduled periodic refresh' },
  { value: 'TECHNICAL',  label: 'Technical',         description: 'Skill upgrade or SOP revision-driven training' },
  { value: 'EXTERNAL',   label: 'External training', description: 'Director-approved external programme' },
]

export function AssignTrainingForm({ topics, initialTopicId }: Props) {
  const router = useRouter()

  const [mode, setMode] = useState<'bulk' | 'individual'>('bulk')

  const [form, setForm] = useState({
    topicId:            initialTopicId ?? '',
    trigger:            'INDUCTION',
    dueDate:            '',
    needIdentifiedById: '',
    needBasis:          '',
  })

  const preselectedTopic = topics.find((t) => t.id === initialTopicId)

  // ── Multi-department + per-department section selection (bulk mode) ──
  const [departments,      setDepartments]     = useState<Department[]>([])
  const [selectedDeptIds,  setSelectedDeptIds]  = useState<string[]>([])
  // Map of departmentId -> selected sectionIds for that department.
  // Empty/absent array = whole department (no section filter).
  const [sectionSelections, setSectionSelections] = useState<Record<string, string[]>>({})

  const [persons,         setPersons]         = useState<Person[]>([])
  const [managers,        setManagers]        = useState<Person[]>([])
  const [selectedPersons, setSelectedPersons] = useState<string[]>([])
  const [loadingPersons,  setLoadingPersons]  = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)

  // Load departments with sections
  useEffect(() => {
    async function fetchDepts() {
      const res  = await fetch('/api/departments')
      const data = await res.json()
      setDepartments(data.departments ?? [])
    }
    fetchDepts()
  }, [])

  // Fetch potential "need identified by" managers
  useEffect(() => {
    async function fetchManagers() {
      const res  = await fetch('/api/personnel?isActive=true')
      const data = await res.json()
      const people = (data.persons ?? []) as Person[]
      setManagers(people.filter((p) => p.roles.some((r) => ['ADMINISTRATOR', 'TRAINER'].includes(r))))
    }
    fetchManagers()
  }, [])

  // Fetch persons when switching to individual mode
  useEffect(() => {
    if (mode !== 'individual') return

    async function fetchPersons() {
      setLoadingPersons(true)
      const res  = await fetch('/api/personnel?isActive=true')
      const data = await res.json()
      setPersons(data.persons ?? [])
      setLoadingPersons(false)
    }
    fetchPersons()
  }, [mode])

  // ── Department toggle (checkbox) ────────────────────────────────
  function toggleDepartment(deptId: string) {
    setSelectedDeptIds((prev) => {
      if (prev.includes(deptId)) {
        // Deselecting — also clear its section selections
        setSectionSelections((sPrev) => {
          const next = { ...sPrev }
          delete next[deptId]
          return next
        })
        return prev.filter((id) => id !== deptId)
      }
      return [...prev, deptId]
    })
  }

  // ── Section toggle within a specific department ─────────────────
  function toggleSection(deptId: string, sectionId: string) {
    setSectionSelections((prev) => {
      const current = prev[deptId] ?? []
      const next = current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId]
      return { ...prev, [deptId]: next }
    })
  }

  function toggleAllSections(deptId: string, allSectionIds: string[]) {
    setSectionSelections((prev) => {
      const current = prev[deptId] ?? []
      const next = current.length === allSectionIds.length ? [] : allSectionIds
      return { ...prev, [deptId]: next }
    })
  }

  function togglePerson(id: string) {
    setSelectedPersons((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const focusOn = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#2d6a4f'
  }
  const focusOff = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#d1d5db'
  }

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.topicId || !form.dueDate) {
      setError('Topic and due date are required.')
      return
    }
    if (mode === 'bulk' && selectedDeptIds.length === 0) {
      setError('Please select at least one department.')
      return
    }
    if (mode === 'individual' && selectedPersons.length === 0) {
      setError('Please select at least one person.')
      return
    }

    setModalOpen(true)
  }

  async function handleConfirm(justification: string) {
    setModalOpen(false)
    setLoading(true)
    setError(null)

    const endpoint = mode === 'bulk' ? '/api/assignments/bulk' : '/api/assignments'
    const body = mode === 'bulk'
      ? {
          selections: selectedDeptIds.map((deptId) => ({
            departmentId: deptId,
            sectionIds:
              sectionSelections[deptId] && sectionSelections[deptId].length > 0
                ? sectionSelections[deptId]
                : undefined,
          })),
          topicId: form.topicId,
          trigger: form.trigger,
          dueDate: form.dueDate,
          justification,
          needIdentifiedById: form.needIdentifiedById || undefined,
          needBasis:          form.needBasis          || undefined,
        }
      : {
          personIds: selectedPersons,
          topicId:   form.topicId,
          trigger:   form.trigger,
          dueDate:   form.dueDate,
          justification,
          needIdentifiedById: form.needIdentifiedById || undefined,
          needBasis:          form.needBasis          || undefined,
        }

    const res  = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.message ?? 'Failed to assign training.')
      return
    }

    const result = data.result
    setSuccess(
      `Assigned to ${result.created} person${result.created !== 1 ? 's' : ''}.` +
      (result.skipped > 0
        ? ` ${result.skipped} already had an active assignment and were skipped.`
        : '')
    )

    setTimeout(() => router.push('/assignments'), 2200)
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
  const inputStyle = { borderColor: '#d1d5db', background: '#fff' }

  const selectedDepartments = departments.filter((d) => selectedDeptIds.includes(d.id))

  return (
    <>
      <div
        className="bg-white rounded-2xl border p-6"
        style={{ borderColor: '#e5e7eb' }}
      >
        {/* Mode toggle */}
        <div className="flex gap-2 mb-5 p-1 rounded-lg" style={{ background: '#f4f6f8' }}>
          {(['bulk', 'individual'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="flex-1 py-2 rounded-md text-sm font-medium transition-all"
              style={{
                background: mode === m ? '#fff' : 'transparent',
                color:      mode === m ? '#2d6a4f' : '#6b7280',
                boxShadow:  mode === m ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              {m === 'bulk' ? 'By department' : 'Select individuals'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmitClick} className="flex flex-col gap-5">

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Training topic <span className="text-red-500">*</span>
            </label>
            <select
              name="topicId"
              value={form.topicId}
              onChange={handleChange}
              className={inputClass}
              style={inputStyle}
              onFocus={focusOn}
              onBlur={focusOff}
            >
              <option value="">Select topic</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {preselectedTopic && form.topicId === preselectedTopic.id && (
              <p className="text-xs mt-1.5" style={{ color: '#2d6a4f' }}>
                Pre-selected from "{preselectedTopic.name}" — change it above if needed.
              </p>
            )}
          </div>

          {/* Trigger + Due date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Trigger reason <span className="text-red-500">*</span>
              </label>
              <select
                name="trigger"
                value={form.trigger}
                onChange={handleChange}
                className={inputClass}
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              >
                {TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Due date <span className="text-red-500">*</span>
              </label>
              <input
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={handleChange}
                className={inputClass}
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              />
            </div>
          </div>

          {/* Training Need Identification — per SOP Format 007-04 */}
          <div
            className="p-4 rounded-xl border"
            style={{ background: '#fafafa', borderColor: '#e5e7eb' }}
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Training Need Identification (Format QbD/QA/F/007-04)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Need identified by
                </label>
                <select
                  name="needIdentifiedById"
                  value={form.needIdentifiedById}
                  onChange={handleChange}
                  className={inputClass}
                  style={inputStyle}
                  onFocus={focusOn}
                  onBlur={focusOff}
                >
                  <option value="">Select person (optional)</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.designation}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Basis of identification
                </label>
                <input
                  name="needBasis"
                  value={form.needBasis}
                  onChange={handleChange}
                  placeholder="e.g. Job description review, skill gap assessment"
                  className={inputClass}
                  style={inputStyle}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>
            </div>
          </div>

          {/* Bulk mode — multi-department + per-department section selection */}
          {mode === 'bulk' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Departments <span className="text-red-500">*</span>
                  <span className="text-xs font-normal text-gray-400 ml-2">
                    (select one or more)
                  </span>
                </label>
                <div
                  className="border rounded-lg overflow-hidden"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  {departments.map((d) => {
                    const checked = selectedDeptIds.includes(d.id)
                    return (
                      <label
                        key={d.id}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
                        style={{
                          borderBottom: '1px solid #f3f4f6',
                          background:   checked ? '#f0fdf4' : '#fff',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDepartment(d.id)}
                          className="w-4 h-4 accent-green-700"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {d.name}{d._count ? ` (${d._count.persons} people)` : ''}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Per-department section pickers (labeled with their Unit) */}
              {selectedDepartments.map((dept) => {
                const deptSections = dept.units.flatMap((u) =>
                  u.sections.map((s) => ({ ...s, label: `${u.name} — ${s.name}` }))
                )

                if (deptSections.length === 0) {
                  return (
                    <div
                      key={dept.id}
                      className="text-xs px-3 py-2 rounded-lg"
                      style={{ background: '#f9fafb', color: '#6b7280' }}
                    >
                      <strong>{dept.name}</strong> has no sections — training will be assigned to all persons in this department.
                    </div>
                  )
                }

                const deptSectionIds = sectionSelections[dept.id] ?? []
                const allSectionIds  = deptSections.map((s) => s.id)

                return (
                  <div key={dept.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {dept.name} — Sections
                      <span className="text-xs font-normal text-gray-400 ml-2">
                        (leave all unselected to assign to entire department)
                      </span>
                    </label>
                    <div
                      className="border rounded-lg overflow-hidden"
                      style={{ borderColor: '#e5e7eb' }}
                    >
                      <div
                        className="flex items-center justify-between px-4 py-2 cursor-pointer"
                        style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}
                      >
                        <span className="text-xs font-semibold text-gray-600">
                          {deptSectionIds.length === 0
                            ? `All sections (${deptSections.length})`
                            : `${deptSectionIds.length} of ${deptSections.length} selected`}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleAllSections(dept.id, allSectionIds)}
                          className="text-xs font-medium"
                          style={{ color: '#2d6a4f' }}
                        >
                          {deptSectionIds.length === allSectionIds.length ? 'Deselect all' : 'Select all'}
                        </button>
                      </div>
                      {deptSections.map((section) => {
                        const selected = deptSectionIds.includes(section.id)
                        return (
                          <label
                            key={section.id}
                            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
                            style={{
                              borderBottom: '1px solid #f3f4f6',
                              background:   selected ? '#f0fdf4' : '#fff',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSection(dept.id, section.id)}
                              className="w-4 h-4 accent-green-700"
                            />
                            <span className="text-sm text-gray-800">{section.label}</span>
                          </label>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {deptSectionIds.length === 0
                        ? `Training will be assigned to all persons in ${dept.name}`
                        : `Training will be assigned to persons in ${deptSectionIds.length} selected section(s) of ${dept.name} only`}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Individual mode — person multi-select */}
          {mode === 'individual' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Select people <span className="text-red-500">*</span>
              </label>
              {loadingPersons ? (
                <p className="text-sm text-gray-400">Loading personnel...</p>
              ) : (
                <div
                  className="border rounded-lg max-h-64 overflow-y-auto"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  {persons.map((p) => {
                    const selected = selectedPersons.includes(p.id)
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
                        style={{
                          borderBottom: '1px solid #f3f4f6',
                          background:   selected ? '#f0fdf4' : '#fff',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => togglePerson(p.id)}
                          className="w-4 h-4 accent-green-700"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {p.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {p.employeeId} · {p.department?.name ?? 'No department'}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
              {selectedPersons.length > 0 && (
                <p className="text-xs mt-2" style={{ color: '#2d6a4f' }}>
                  {selectedPersons.length} person(s) selected
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="text-sm px-4 py-3 rounded-lg border"
              style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}
            >
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div
              className="text-sm px-4 py-3 rounded-lg border"
              style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}
            >
              {success}
            </div>
          )}

          {/* Actions */}
          {!success && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <a
                href="/assignments"
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
                {loading ? 'Assigning...' : 'Assign training'}
              </button>
            </div>
          )}
        </form>
      </div>

      <JustificationModal
        isOpen={modalOpen}
        title="Confirm training assignment"
        description={
          mode === 'bulk'
            ? `This will assign training to active people in ${selectedDepartments.length} selected department(s).`
            : `This will assign training to ${selectedPersons.length} selected person(s).`
        }
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        loading={loading}
      />
    </>
  )
}