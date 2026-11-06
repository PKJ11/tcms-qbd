'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { JustificationModal } from '@/components/JustificationModal'
import { getTopicContentStatus, TOPIC_STATUS_STYLE } from './status'
import { FolderIcon } from './FolderPicker'

interface TopicScope {
  department: { id: string; name: string }
  unit:       { id: string; name: string } | null
  section:    { id: string; name: string } | null
}

interface Topic {
  id:           string
  name:         string
  description:  string | null
  trainingType: string
  isActive:     boolean
  createdAt:    string
  createdBy:    { id: string; name: string }
  topicScopes:  TopicScope[]
  _count:       { assignments: number; materials: number }
  questionBank: { currentVersion: { _count: { questions: number } } | null } | null
  folderItems:  { folder: { id: string; name: string } }[]
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'PENDING' | 'INACTIVE'
type SortOrder     = 'newest' | 'oldest'

// folderKey: a folder id, 'all' for every topic, or 'none' for topics in no folder
export function TopicsList({ canCreate, folderKey, folderName }: { canCreate: boolean; folderKey: string; folderName: string }) {
  const router = useRouter()
  const [topics,           setTopics]           = useState<Topic[]>([])
  const [loading,          setLoading]          = useState(true)
  const [search,           setSearch]           = useState('')
  const [statusFilter,     setStatusFilter]     = useState<StatusFilter>('ALL')
  const [sortOrder,        setSortOrder]        = useState<SortOrder>('newest')
  const [deactivateTarget, setDeactivateTarget] = useState<Topic | null>(null)
  const [modalLoading,     setModalLoading]     = useState(false)

  // Filing topics into / out of the open folder
  const [removeTarget,  setRemoveTarget]  = useState<Topic | null>(null)
  const [notice,        setNotice]        = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(null)
  const [pickerOpen,    setPickerOpen]    = useState(false)
  const [pickerTopics,  setPickerTopics]  = useState<Topic[]>([])
  const [activeTotal,   setActiveTotal]   = useState(0)
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerSearch,  setPickerSearch]  = useState('')
  const [pickerChosen,  setPickerChosen]  = useState<string[]>([])
  const [addConfirm,    setAddConfirm]    = useState(false)

  // Inactive topics live behind a different flag server-side, so that's the
  // only piece of the status filter that needs a re-fetch. Active vs Pending
  // is derived from content readiness we already have on each topic, so it's
  // filtered client-side instead.
  const fetchTopics = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      isActive: statusFilter === 'INACTIVE' ? 'false' : 'true',
      ...(search ? { search } : {}),
      ...(folderKey !== 'all' ? { folderId: folderKey } : {}),
    })
    const res  = await fetch(`/api/topics?${params}`)
    const data = await res.json()
    setTopics(data.topics ?? [])
    setLoading(false)
  }, [search, statusFilter, folderKey])

  useEffect(() => { fetchTopics() }, [fetchTopics])

  const activeFolderName = folderKey === 'all' ? null : folderName
  const isRealFolder     = folderKey !== 'all' && folderKey !== 'none'

  const visibleTopics = useMemo(() => {
    const filtered = topics.filter((topic) => {
      if (statusFilter === 'ALL' || statusFilter === 'INACTIVE') return true
      const status = getTopicContentStatus({
        isActive:      topic.isActive,
        trainingType:  topic.trainingType,
        materialCount: topic._count.materials,
        questionCount: topic.questionBank?.currentVersion?._count.questions ?? 0,
      })
      return status === statusFilter
    })

    return filtered.slice().sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortOrder === 'newest' ? -diff : diff
    })
  }, [topics, statusFilter, sortOrder])

  async function handleDeactivate(justification: string) {
    if (!deactivateTarget) return
    setModalLoading(true)

    await fetch(`/api/topics/${deactivateTarget.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'deactivate', justification }),
    })

    setModalLoading(false)
    setDeactivateTarget(null)
    fetchTopics()
    router.refresh()   // folder counts on the home screen
  }

  function askRemove(topic: Topic) {
    setNotice(null)
    if ((topic.folderItems ?? []).length <= 1) {
      setNotice({
        kind: 'warn',
        text: `"${topic.name}" is only in ${folderName}. Add it to another folder first (Edit folders on the topic page) — every topic must stay in at least one folder.`,
      })
      return
    }
    setRemoveTarget(topic)
  }

  async function handleRemove(justification: string) {
    if (!removeTarget) return
    setModalLoading(true)
    const res  = await fetch(`/api/topic-folders/${encodeURIComponent(folderKey)}/topics`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ topicId: removeTarget.id, justification }),
    })
    const data = await res.json().catch(() => ({}))
    setModalLoading(false)
    setNotice(res.ok
      ? { kind: 'ok', text: `"${removeTarget.name}" was removed from ${folderName}.` }
      : { kind: 'error', text: data.message ?? 'Could not remove the topic from this folder.' })
    setRemoveTarget(null)
    fetchTopics()
    router.refresh()
  }

  async function openPicker() {
    setNotice(null)
    setPickerOpen(true); setPickerChosen([]); setPickerSearch(''); setPickerLoading(true)
    const res  = await fetch('/api/topics?isActive=true')
    const data = await res.json().catch(() => ({}))
    const active = (data.topics ?? []) as Topic[]
    setActiveTotal(active.length)
    setPickerTopics(active.filter((t) => !(t.folderItems ?? []).some((i) => i.folder.id === folderKey)))
    setPickerLoading(false)
  }

  async function handleAdd(justification: string) {
    setModalLoading(true)
    const res  = await fetch(`/api/topic-folders/${encodeURIComponent(folderKey)}/topics`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ topicIds: pickerChosen, justification }),
    })
    const data = await res.json().catch(() => ({}))
    setModalLoading(false)
    setAddConfirm(false)
    if (!res.ok) { setNotice({ kind: 'error', text: data.message ?? 'Could not add the topics.' }); return }
    setPickerOpen(false)
    setNotice({ kind: 'ok', text: `${data.added} topic${data.added === 1 ? '' : 's'} added to ${folderName}.` })
    fetchTopics()
    router.refresh()
  }

  const pickerVisible = pickerTopics.filter((t) => !pickerSearch.trim() || t.name.toLowerCase().includes(pickerSearch.trim().toLowerCase()))
  const chosenNames   = pickerTopics.filter((t) => pickerChosen.includes(t.id)).map((t) => t.name)

  return (
    <>
      {/* Folder actions */}
      {canCreate && isRealFolder && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="text-sm text-gray-500">
            Topics can be in several folders. Removing a topic here only takes it out of {folderName}.
          </p>
          <button
            type="button"
            onClick={openPicker}
            className="px-3.5 py-2 rounded-lg border text-sm font-medium bg-white"
            style={{ borderColor: '#2d6a4f', color: '#2d6a4f' }}
          >
            + Add existing topics
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 text-sm px-4 py-3 rounded-lg border mb-3"
          style={
            notice.kind === 'ok'   ? { background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' } :
            notice.kind === 'warn' ? { background: '#fffbeb', borderColor: '#fde68a', color: '#92400e' } :
                                     { background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }
          }
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="flex-shrink-0 opacity-70 hover:opacity-100">×</button>
        </div>
      )}

      {/* Filters */}
      <div
        className="bg-white rounded-xl border p-4 mb-4 flex flex-wrap gap-3"
        style={{ borderColor: '#e5e7eb' }}
      >
        <div className="relative flex-1 min-w-48">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            width="15" height="15"
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: '#e5e7eb' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>

        <div className="ml-auto text-sm text-gray-400 self-center">
          {visibleTopics.length} topic{visibleTopics.length !== 1 ? 's' : ''}
          {activeFolderName ? ` in ${activeFolderName}` : ''}
        </div>
      </div>

      {/* Topic cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading topics...
        </div>
      ) : visibleTopics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
          </svg>
          <p className="text-sm text-gray-400">
            {activeFolderName && !search ? `No topics in ${activeFolderName} yet` : 'No topics found'}
          </p>
          {canCreate && !search && folderKey !== 'none' && (
            <a
              href={isRealFolder ? `/topics/new?folder=${encodeURIComponent(folderKey)}` : '/topics/new'}
              className="text-sm font-medium"
              style={{ color: '#2d6a4f' }}
            >
              {isRealFolder ? `Add the first topic to ${folderName} →` : 'Add the first topic →'}
            </a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleTopics.map((topic) => (
            <div
              key={topic.id}
              className="bg-white rounded-xl border p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
              style={{ borderColor: '#e5e7eb' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {topic.name}
                  </h3>
                  {topic.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {topic.description}
                    </p>
                  )}
                </div>
                {(() => {
                  const status = getTopicContentStatus({
                    isActive:      topic.isActive,
                    trainingType:  topic.trainingType,
                    materialCount: topic._count.materials,
                    questionCount: topic.questionBank?.currentVersion?._count.questions ?? 0,
                  })
                  const style = TOPIC_STATUS_STYLE[status]
                  return (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                      style={{ background: style.bg, color: style.color }}
                      title={status === 'PENDING' ? 'Setup incomplete — not yet assignable' : undefined}
                    >
                      {style.label}
                    </span>
                  )
                })()}
              </div>

              {/* Training type */}
              <span
                className="self-start px-2 py-0.5 rounded text-xs font-semibold"
                style={{ background: '#fefce8', color: '#854d0e' }}
              >
                {topic.trainingType.replace(/_/g, ' ')}
              </span>

              {/* Folders */}
              <div className="flex flex-wrap gap-1.5">
                {(topic.folderItems ?? []).length === 0 ? (
                  <span className="text-xs text-gray-400">No folder</span>
                ) : (
                  topic.folderItems.map(({ folder }) => (
                    <a
                      key={folder.id}
                      href={`/topics?folder=${encodeURIComponent(folder.id)}`}
                      title={`Open the ${folder.name} folder`}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: folder.id === folderKey ? '#2d6a4f' : '#f0fdf4',
                        color:      folder.id === folderKey ? '#fff'    : '#166534',
                      }}
                    >
                      <FolderIcon size={12} />
                      {folder.name}
                    </a>
                  ))
                )}
              </div>

              {/* Scopes */}
              <div className="flex flex-wrap gap-1.5">
                {topic.topicScopes.length === 0 ? (
                  <span className="text-xs text-gray-400">No scope assigned</span>
                ) : (
                  topic.topicScopes.map((ts, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{ background: '#eff6ff', color: '#1d4ed8' }}
                    >
                      {ts.department.name}
                      {ts.unit ? ` → ${ts.unit.name}` : ''}
                      {ts.section ? ` → ${ts.section.name}` : ''}
                    </span>
                  ))
                )}
              </div>

              {/* Stats */}
              <div
                className="flex items-center gap-4 pt-2 text-xs text-gray-400"
                style={{ borderTop: '1px solid #f3f4f6' }}
              >
                <span>{topic._count.materials} material{topic._count.materials !== 1 ? 's' : ''}</span>
                <span>{topic._count.assignments} assignment{topic._count.assignments !== 1 ? 's' : ''}</span>
                <span className="ml-auto">{formatDate(topic.createdAt)}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <a
                  href={`/topics/${topic.id}`}
                  className="flex-1 text-center py-1.5 rounded-lg border text-xs font-medium transition-colors"
                  style={{ borderColor: '#e5e7eb', color: '#374151' }}
                >
                  View details
                </a>
                {canCreate && isRealFolder && (
                  <button
                    onClick={() => askRemove(topic)}
                    title={`Take this topic out of ${folderName}`}
                    className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                    style={{ borderColor: '#e5e7eb', color: '#374151' }}
                  >
                    Remove from folder
                  </button>
                )}
                {canCreate && topic.isActive && (
                  <button
                    onClick={() => setDeactivateTarget(topic)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                    style={{ borderColor: '#fecaca', color: '#dc2626' }}
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <JustificationModal
        isOpen={!!deactivateTarget}
        title={`Deactivate "${deactivateTarget?.name ?? ''}"`}
        description="This topic will no longer be assignable. Existing assignments are not affected."
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
        loading={modalLoading}
      />

      {/* Remove from folder — e-signature */}
      <JustificationModal
        isOpen={!!removeTarget}
        title={`Remove from ${folderName}`}
        description={`"${removeTarget?.name ?? ''}" will be taken out of ${folderName}. It stays in its other folders and nothing else about the topic changes.`}
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
        loading={modalLoading}
      />

      {/* Add existing topics — picker */}
      {pickerOpen && !addConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.4)' }} role="dialog" aria-modal="true" aria-label={`Add topics to ${folderName}`}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col max-h-[85vh]" style={{ border: '1px solid #e5e7eb' }}>
            <div className="px-6 pt-5 pb-3" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <h3 className="text-base font-semibold text-gray-900">Add topics to {folderName}</h3>
              <p className="text-xs text-gray-500 mt-0.5">Only active topics that aren’t already in this folder are listed.</p>
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Search topics..."
                aria-label="Search topics"
                className="mt-3 w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#e5e7eb' }}
              />
            </div>
            <div className="px-3 py-2 overflow-y-auto flex-1 min-h-[8rem]">
              {pickerLoading ? (
                <p className="text-sm text-gray-400 px-3 py-6 text-center">Loading topics...</p>
              ) : pickerVisible.length === 0 ? (
                <p className="text-sm text-gray-400 px-3 py-6 text-center">
                  {activeTotal === 0
                    ? 'There are no active topics yet. Create one with “Add topic here”.'
                    : pickerTopics.length === 0
                    ? `Every active topic is already in ${folderName}.`
                    : 'No topics match your search.'}
                </p>
              ) : (
                pickerVisible.map((t) => {
                  const on = pickerChosen.includes(t.id)
                  return (
                    <label key={t.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setPickerChosen(on ? pickerChosen.filter((x) => x !== t.id) : [...pickerChosen, t.id])}
                        className="w-4 h-4 mt-0.5 accent-green-700"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-800">{t.name}</span>
                        <span className="block text-xs text-gray-400">
                          {(t.folderItems ?? []).length ? 'In: ' + t.folderItems.map((i) => i.folder.name).join(', ') : 'Not in any folder'}
                        </span>
                      </span>
                    </label>
                  )
                })
              )}
            </div>
            <div className="px-6 py-4 flex items-center justify-between gap-3" style={{ borderTop: '1px solid #f3f4f6' }}>
              <span className="text-xs text-gray-500">{pickerChosen.length} selected</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPickerOpen(false)} className="px-4 py-2 rounded-lg border text-sm font-medium" style={{ borderColor: '#e5e7eb', color: '#374151' }}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pickerChosen.length === 0}
                  onClick={() => setAddConfirm(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: '#2d6a4f' }}
                >
                  Add {pickerChosen.length || ''} topic{pickerChosen.length === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <JustificationModal
        isOpen={addConfirm}
        title={`Add to ${folderName}`}
        description={`Adding to ${folderName}: ${chosenNames.join(', ')}.`}
        onConfirm={handleAdd}
        onCancel={() => setAddConfirm(false)}
        loading={modalLoading}
      />
    </>
  )
}