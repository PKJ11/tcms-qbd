'use client'

import { useState, useEffect, useCallback } from 'react'
import { JustificationModal } from '@/components/JustificationModal'
import { DragDropTopicPicker } from './DragDropTopicPicker'

interface Topic   { id: string; name: string }
interface Section { id: string; name: string; code: string }
interface Scope {
  department: { id: string; name: string; code: string }
  unit:       { id: string; name: string }
  sections:   Section[]
}
interface GroupItem { id: string; position: number; topic: { id: string; name: string } }
interface Group {
  id:         string
  name:       string
  isActive:   boolean
  createdAt:  string
  department: { id: string; name: string; code: string }
  unit:       { id: string; name: string }
  section:    { id: string; name: string } | null
  createdBy:  { id: string; name: string }
  items:      GroupItem[]
}

function scopeLabel(department: { code: string }, unit: { name: string }) {
  return `${department.code} ${unit.name}`
}

export function TopicGroupBuilder() {
  const [topics,  setTopics]  = useState<Topic[]>([])
  const [scope,   setScope]   = useState<Scope | null>(null)
  const [groups,  setGroups]  = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  const [newName,      setNewName]      = useState('')
  const [newScopeMode, setNewScopeMode] = useState<'unit' | 'section'>('unit')
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

  function startCreate() {
    setError(null)
    if (newName.trim().length < 3) {
      setError('Group name must be at least 3 characters.')
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
            sectionId: newScopeMode === 'section' ? newSectionId : null,
            topicIds:  newTopicIds,
            justification,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? 'Failed to create topic group')
        setMessage(`"${data.group.name}" created with ${data.group.items.length} topic(s).`)
        setNewName('')
        setNewScopeMode('unit')
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

  const myScopeLabel = scopeLabel(scope.department, scope.unit)

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

      {/* Create panel */}
      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-sm font-semibold text-gray-800">Create a new topic group</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
            {myScopeLabel}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          You can only create topic groups for your own team — <strong>{myScopeLabel}</strong>. A
          whole-unit group applies to every new joinee of {myScopeLabel}; a section group applies
          only to new joinees of that one section, <em>on top of</em> any whole-unit groups.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Group name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`e.g. ${myScopeLabel} Induction Bundle`}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: '#d1d5db' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Applies to</label>
            <div className="flex gap-2">
              <select
                value={newScopeMode}
                onChange={(e) => setNewScopeMode(e.target.value as 'unit' | 'section')}
                className="px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#d1d5db' }}
              >
                <option value="unit">Whole unit ({myScopeLabel})</option>
                <option value="section" disabled={scope.sections.length === 0}>
                  One section only{scope.sections.length === 0 ? ' (no sections in your unit)' : ''}
                </option>
              </select>
              {newScopeMode === 'section' && (
                <select
                  value={newSectionId}
                  onChange={(e) => setNewSectionId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: '#d1d5db' }}
                >
                  <option value="">Select section</option>
                  {scope.sections.map((s) => (
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
            className="px-5 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: '#2d6a4f' }}
          >
            Create group
          </button>
        </div>
      </div>

      {/* Existing groups */}
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          Topic groups for {myScopeLabel} ({groups.length})
        </h2>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 bg-white rounded-xl border" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-sm text-gray-400">No topic groups yet — create one above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((g) => {
              const isEditing = editingGroupId === g.id
              return (
                <div key={g.id} className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900">{g.name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                          {scopeLabel(g.department, g.unit)}
                        </span>
                        {g.section && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#f5f3ff', color: '#6d28d9' }}>
                            → {g.section.name} only
                          </span>
                        )}
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

      <JustificationModal
        isOpen={modal !== null}
        title={
          modal?.kind === 'create'     ? 'Confirm topic group creation' :
          modal?.kind === 'edit'       ? 'Confirm topic group update'   :
          'Confirm topic group deactivation'
        }
        description={
          modal?.kind === 'create'
            ? `This creates the group and immediately applies it to every future new joinee of ${myScopeLabel}${newScopeMode === 'section' ? ' (the selected section only)' : ''}. The reason you provide is the official record of why this group exists.`
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
