'use client'

import { useState, useEffect, useCallback } from 'react'
import { JustificationModal } from '@/components/JustificationModal'
import { DragDropTopicPicker } from './DragDropTopicPicker'

interface Topic   { id: string; name: string }
interface Section { id: string; name: string; code: string }
interface ScopeUnit { id: string; name: string; sections: Section[] }
interface Scope {
  department: { id: string; name: string; code: string }
  myUnitId:   string
  units:      ScopeUnit[]
}
interface GroupItem { id: string; position: number; topic: { id: string; name: string } }
interface Group {
  id:         string
  name:       string
  isActive:   boolean
  createdAt:  string
  department: { id: string; name: string; code: string }
  unit:       { id: string; name: string } | null
  section:    { id: string; name: string } | null
  createdBy:  { id: string; name: string }
  items:      GroupItem[]
}

type ScopeMode = 'department' | 'unit' | 'section'

// Auto-name each group after the scope it covers:
//   department  ->  DEFAULT TRAINING FOR QA
//   unit        ->  DEFAULT TRAINING FOR QA UNIT 2
//   section     ->  DEFAULT TRAINING FOR QA UNIT 2 LCMS
function defaultGroupName(
  mode:     ScopeMode,
  deptCode: string,
  unitName?: string | null,
  sectionName?: string | null,
) {
  const parts = [`DEFAULT TRAINING FOR ${deptCode}`]
  if (mode !== 'department' && unitName) parts.push(unitName)
  if (mode === 'section' && sectionName) parts.push(sectionName)
  return parts.join(' ').toUpperCase()
}

function groupScopeLabel(g: Group) {
  const dept = g.department.code
  if (!g.unit)    return `${dept} · department-wide`
  if (!g.section) return `${dept} ${g.unit.name} · whole unit`
  return `${dept} ${g.unit.name} → ${g.section.name} only`
}

export function TopicGroupBuilder() {
  const [topics,  setTopics]  = useState<Topic[]>([])
  const [scope,   setScope]   = useState<Scope | null>(null)
  const [groups,  setGroups]  = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  const [newName,      setNewName]      = useState('')
  const [nameDirty,    setNameDirty]    = useState(false)
  const [newScopeMode, setNewScopeMode] = useState<ScopeMode>('department')
  const [newUnitId,    setNewUnitId]    = useState('')
  const [newSectionId, setNewSectionId] = useState('')
  const [newTopicIds,  setNewTopicIds]  = useState<string[]>([])

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editTopicIds,   setEditTopicIds]   = useState<string[]>([])

  const [modal,   setModal]   = useState<null | { kind: 'create' } | { kind: 'edit'; groupId: string } | { kind: 'deactivate'; groupId: string; name: string }>(null)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [metaRes, groupsRes] = await Promise.all([
      fetch('/api/topic-groups/meta'),
      fetch('/api/topic-groups'),
    ])
    const meta       = await metaRes.json()
    const groupsData = await groupsRes.json()
    setTopics(meta.topics ?? [])
    setScope(meta.scope ?? null)
    setGroups(groupsData.groups ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Default the unit picker to the trainer's own unit once the scope loads.
  useEffect(() => {
    if (!scope || newUnitId) return
    setNewUnitId(
      scope.units.some((u) => u.id === scope.myUnitId) ? scope.myUnitId : (scope.units[0]?.id ?? ''),
    )
  }, [scope, newUnitId])

  const selectedUnit     = scope?.units.find((u) => u.id === newUnitId) ?? null
  const selectedSection  = selectedUnit?.sections.find((s) => s.id === newSectionId) ?? null

  // Keep the name in sync with the chosen scope until the trainer types
  // their own name (nameDirty). Changing scope again resumes auto-naming.
  useEffect(() => {
    if (!scope || nameDirty) return
    setNewName(defaultGroupName(newScopeMode, scope.department.code, selectedUnit?.name, selectedSection?.name))
  }, [scope, nameDirty, newScopeMode, selectedUnit?.name, selectedSection?.name])

  // Whole-department group first, then by unit A–Z, whole-unit before its
  // sections, then section A–Z.
  const sortedGroups = [...groups].sort((a, b) => {
    if (!a.unit && b.unit) return -1
    if (a.unit && !b.unit) return 1
    const u = (a.unit?.name ?? '').localeCompare(b.unit?.name ?? '')
    if (u !== 0) return u
    if (!a.section && b.section) return -1
    if (a.section && !b.section) return 1
    return (a.section?.name ?? '').localeCompare(b.section?.name ?? '')
  })

  // The scope this "Create" form currently targets, and whether a group
  // for it already exists — one group per unique scope is the rule.
  const targetUnitId    = newScopeMode === 'department' ? null : (newUnitId || null)
  const targetSectionId = newScopeMode === 'section' ? (newSectionId || null) : null
  const scopeSelected =
    newScopeMode === 'department' ||
    (newScopeMode === 'unit' && !!newUnitId) ||
    (newScopeMode === 'section' && !!newUnitId && !!newSectionId)
  const existingForScope = scopeSelected
    ? groups.find(
        (g) => (g.unit?.id ?? null) === targetUnitId && (g.section?.id ?? null) === targetSectionId,
      ) ?? null
    : null

  function jumpToExisting(groupId: string) {
    const g = groups.find((x) => x.id === groupId)
    if (!g) return
    setEditingGroupId(groupId)
    setEditTopicIds(g.items.map((i) => i.topic.id))
    document.getElementById(`group-${groupId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function startCreate() {
    setError(null)
    if (existingForScope) {
      setError(`"${existingForScope.name}" already covers this scope — edit that group instead.`)
      jumpToExisting(existingForScope.id)
      return
    }
    if (newName.trim().length < 3) {
      setError('Group name must be at least 3 characters.')
      return
    }
    if (newScopeMode !== 'department' && !newUnitId) {
      setError('Please select a unit.')
      return
    }
    if (newScopeMode === 'section' && !newSectionId) {
      setError('Please select a section.')
      return
    }
    if (newTopicIds.length === 0) {
      setError('Add at least one topic to the group.')
      return
    }
    setModal({ kind: 'create' })
  }

  function startEditSave(groupId: string) {
    setError(null)
    setModal({ kind: 'edit', groupId })
  }

  async function handleConfirm(justification: string) {
    if (!modal) return
    setSaving(true)
    setError(null)

    try {
      if (modal.kind === 'create') {
        const res = await fetch('/api/topic-groups', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            name:      newName.trim(),
            unitId:    newScopeMode === 'department' ? null : newUnitId,
            sectionId: newScopeMode === 'section' ? newSectionId : null,
            topicIds:  newTopicIds,
            justification,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? 'Failed to create topic group')
        setMessage(`"${data.group.name}" created with ${data.group.items.length} topic(s).`)
        setNewName('')
        setNameDirty(false)
        setNewScopeMode('department')
        setNewSectionId('')
        setNewTopicIds([])
      } else if (modal.kind === 'edit') {
        const res = await fetch(`/api/topic-groups/${modal.groupId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ topicIds: editTopicIds, justification }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? 'Failed to update topic group')
        setMessage(`"${data.group.name}" updated.`)
        setEditingGroupId(null)
      } else if (modal.kind === 'deactivate') {
        const res = await fetch(`/api/topic-groups/${modal.groupId}?justification=${encodeURIComponent(justification)}`, {
          method: 'DELETE',
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? 'Failed to deactivate topic group')
        setMessage(`"${modal.name}" deactivated.`)
      }

      await fetchAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
      setModal(null)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  if (loading || !scope) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Loading topic groups...
      </div>
    )
  }

  const deptLabel = scope.department.code

  return (
    <div className="flex flex-col gap-6">
      {message && (
        <div className="text-sm px-4 py-3 rounded-lg border" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
          {message}
        </div>
      )}
      {error && (
        <div className="text-sm px-4 py-3 rounded-lg border" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* ── Existing groups (top) ─────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          Topic groups for {scope.department.name} ({groups.length})
        </h2>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 bg-white rounded-xl border" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-sm text-gray-400">No topic groups yet — create one below.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sortedGroups.map((g) => {
              const isEditing = editingGroupId === g.id
              return (
                <div id={`group-${g.id}`} key={g.id} className="bg-white rounded-xl border p-5" style={{ borderColor: isEditing ? '#2d6a4f' : '#e5e7eb' }}>
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900">{g.name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                          {groupScopeLabel(g)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Created by {g.createdBy.name} · {new Date(g.createdAt).toLocaleDateString('en-IN')} · {g.items.length} topic{g.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => { setEditingGroupId(null) }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                            style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => startEditSave(g.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                            style={{ background: '#2d6a4f' }}
                          >
                            Save changes
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditingGroupId(g.id); setEditTopicIds(g.items.map((i) => i.topic.id)) }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                            style={{ borderColor: '#e5e7eb', color: '#374151' }}
                          >
                            Edit topics
                          </button>
                          <button
                            onClick={() => setModal({ kind: 'deactivate', groupId: g.id, name: g.name })}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                            style={{ borderColor: '#fecaca', color: '#dc2626' }}
                          >
                            Deactivate
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <DragDropTopicPicker allTopics={topics} selected={editTopicIds} onChange={setEditTopicIds} />
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {g.items.map((item) => (
                        <span
                          key={item.id}
                          className="px-2.5 py-1 rounded-full text-xs"
                          style={{ background: '#f3f4f6', color: '#374151' }}
                        >
                          {item.topic.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Create panel (bottom) ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-sm font-semibold text-gray-800">Create a new topic group</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
            {scope.department.name}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          You can create groups for any unit in your department — <strong>{scope.department.name}</strong>.
          A <em>department-wide</em> group applies to every new joinee of every unit; a{' '}
          <em>whole-unit</em> group to every new joinee of that unit; a <em>section</em> group only to
          that section — and they stack. One group per scope; pick the scope and the name fills in.
        </p>

        {existingForScope && (
          <div
            className="flex items-center justify-between gap-3 text-xs px-3 py-2 rounded-lg border mb-4"
            style={{ background: '#fffbeb', borderColor: '#fde68a', color: '#92400e' }}
          >
            <span>
              <strong>Already made.</strong> &ldquo;{existingForScope.name}&rdquo; already covers this scope.
            </span>
            <button
              onClick={() => jumpToExisting(existingForScope.id)}
              className="px-2.5 py-1 rounded-md text-xs font-semibold text-white flex-shrink-0"
              style={{ background: '#d97706' }}
            >
              Edit that group
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Group name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setNameDirty(true) }}
              placeholder={`e.g. ${defaultGroupName('department', deptLabel)}`}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: '#d1d5db' }}
            />
            {nameDirty && (
              <button
                type="button"
                onClick={() => setNameDirty(false)}
                className="text-[11px] mt-1 font-medium"
                style={{ color: '#2d6a4f' }}
              >
                Reset to default name
              </button>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Applies to</label>
            <div className="flex flex-wrap gap-2">
              <select
                value={newScopeMode}
                onChange={(e) => {
                  const m = e.target.value as ScopeMode
                  setNewScopeMode(m)
                  if (m !== 'section') setNewSectionId('')
                }}
                className="px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#d1d5db' }}
              >
                <option value="department">Whole department ({deptLabel})</option>
                <option value="unit">Whole unit</option>
                <option value="section">One section only</option>
              </select>

              {newScopeMode !== 'department' && (
                <select
                  value={newUnitId}
                  onChange={(e) => { setNewUnitId(e.target.value); setNewSectionId('') }}
                  className="px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: '#d1d5db' }}
                >
                  <option value="">Select unit</option>
                  {scope.units.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              )}

              {newScopeMode === 'section' && (
                <select
                  value={newSectionId}
                  onChange={(e) => setNewSectionId(e.target.value)}
                  disabled={!selectedUnit || selectedUnit.sections.length === 0}
                  className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none disabled:bg-gray-50 disabled:text-gray-400"
                  style={{ borderColor: '#d1d5db' }}
                >
                  <option value="">
                    {!selectedUnit
                      ? 'Select a unit first'
                      : selectedUnit.sections.length === 0
                      ? 'No sections in this unit'
                      : 'Select section'}
                  </option>
                  {selectedUnit?.sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        <DragDropTopicPicker allTopics={topics} selected={newTopicIds} onChange={setNewTopicIds} />

        <div className="flex justify-end mt-4">
          <button
            onClick={startCreate}
            disabled={!!existingForScope}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#2d6a4f' }}
          >
            Create group
          </button>
        </div>
      </div>

      <JustificationModal
        isOpen={modal !== null}
        title={
          modal?.kind === 'create'     ? 'Confirm topic group creation' :
          modal?.kind === 'edit'       ? 'Confirm topic group update'   :
          'Confirm topic group deactivation'
        }
        description={
          modal?.kind === 'create'
            ? `This creates the group and immediately applies it to every future new joinee of ${
                newScopeMode === 'department'
                  ? scope.department.name
                  : newScopeMode === 'unit'
                  ? `${deptLabel} ${selectedUnit?.name ?? ''}`.trim()
                  : `${deptLabel} ${selectedUnit?.name ?? ''} — ${selectedSection?.name ?? ''} only`.trim()
              }. The reason you provide is the official record of why this group exists.`
            : modal?.kind === 'edit'
            ? `This changes which topics new joinees receive automatically. Existing assignments already created are not affected.`
            : `This stops the group from assigning training to future new joinees. Assignments it already created are not affected.`
        }
        onConfirm={handleConfirm}
        onCancel={() => setModal(null)}
        loading={saving}
        minLength={10}
      />
    </div>
  )
}
