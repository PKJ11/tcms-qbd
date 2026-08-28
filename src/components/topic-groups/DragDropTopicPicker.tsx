'use client'

import { useState } from 'react'

interface Topic { id: string; name: string }

interface Props {
  allTopics: Topic[]
  selected:  string[]           // ordered topic ids
  onChange:  (ids: string[]) => void
}

const DRAG_MIME = 'application/x-topic-id'

export function DragDropTopicPicker({ allTopics, selected, onChange }: Props) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [poolDragOver,  setPoolDragOver]  = useState(false)

  const byId       = new Map(allTopics.map((t) => [t.id, t]))
  const selectedSet = new Set(selected)
  const pool        = allTopics.filter((t) => !selectedSet.has(t.id))

  function addTopic(id: string, atIndex?: number) {
    if (selectedSet.has(id)) return
    const next = [...selected]
    if (atIndex === undefined || atIndex >= next.length) next.push(id)
    else next.splice(atIndex, 0, id)
    onChange(next)
  }

  function removeTopic(id: string) {
    onChange(selected.filter((t) => t !== id))
  }

  function reorder(fromId: string, toIndex: number) {
    const withoutDragged = selected.filter((t) => t !== fromId)
    const clampedIndex   = Math.min(toIndex, withoutDragged.length)
    withoutDragged.splice(clampedIndex, 0, fromId)
    onChange(withoutDragged)
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Pool */}
      <div>
        <div className="text-xs font-medium text-gray-500 mb-2">
          Available topics ({pool.length})
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setPoolDragOver(true) }}
          onDragLeave={() => setPoolDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setPoolDragOver(false)
            const id = e.dataTransfer.getData(DRAG_MIME)
            if (id) removeTopic(id)
          }}
          className="border rounded-lg p-2 h-72 overflow-y-auto flex flex-col gap-1.5 transition-colors"
          style={{ borderColor: poolDragOver ? '#2d6a4f' : '#e5e7eb', background: poolDragOver ? '#f0fdf4' : '#fafafa' }}
        >
          {pool.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-6">All topics added</div>
          ) : (
            pool.map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData(DRAG_MIME, t.id)}
                onDoubleClick={() => addTopic(t.id)}
                title="Drag into the group, or double-click to add"
                className="px-3 py-2 rounded-lg border bg-white text-sm text-gray-700 cursor-grab flex items-center justify-between gap-2"
                style={{ borderColor: '#e5e7eb' }}
              >
                <span className="truncate">{t.name}</span>
                <button
                  type="button"
                  onClick={() => addTopic(t.id)}
                  className="flex-shrink-0 text-xs font-medium"
                  style={{ color: '#2d6a4f' }}
                >
                  + Add
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Group topics — drop zone + reorderable */}
      <div>
        <div className="text-xs font-medium text-gray-500 mb-2">
          Group topics ({selected.length}) <span className="text-gray-400">— drag to reorder</span>
        </div>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const id = e.dataTransfer.getData(DRAG_MIME)
            if (id) addTopic(id)
            setDragOverIndex(null)
          }}
          className="border rounded-lg p-2 h-72 overflow-y-auto flex flex-col gap-1.5"
          style={{ borderColor: '#e5e7eb', background: '#fff' }}
        >
          {selected.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-6">
              Drag topics here, or click “+ Add” on the left
            </div>
          ) : (
            selected.map((id, i) => {
              const topic = byId.get(id)
              if (!topic) return null
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData(DRAG_MIME, id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i) }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const draggedId = e.dataTransfer.getData(DRAG_MIME)
                    if (draggedId) reorder(draggedId, i)
                    setDragOverIndex(null)
                  }}
                  className="px-3 py-2 rounded-lg border text-sm flex items-center justify-between gap-2 cursor-grab transition-colors"
                  style={{
                    borderColor: dragOverIndex === i ? '#2d6a4f' : '#e5e7eb',
                    background:  dragOverIndex === i ? '#f0fdf4' : '#f9fafb',
                  }}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
                    <span className="truncate text-gray-800">{topic.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTopic(id)}
                    className="flex-shrink-0 text-gray-400 hover:text-red-500"
                    aria-label={`Remove ${topic.name}`}
                  >
                    ×
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
