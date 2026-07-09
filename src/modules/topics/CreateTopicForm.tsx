'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'

interface Department {
  id:   string
  name: string
}

interface Props {
  departments: Department[]
}

export function CreateTopicForm({ departments }: Props) {
  const router = useRouter()

  const [name,          setName]          = useState('')
  const [description,   setDescription]   = useState('')
  const [selectedDepts, setSelectedDepts] = useState<string[]>([])
  const [modalOpen,     setModalOpen]     = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  function toggleDept(id: string) {
    setSelectedDepts((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Topic name is required.')
      return
    }
    if (selectedDepts.length === 0) {
      setError('At least one department must be selected.')
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
        name:          name.trim(),
        description:   description.trim() || undefined,
        departmentIds: selectedDepts,
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

          {/* Department selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Applicable departments <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Select all departments that require this training topic. URS-TOP-002.
            </p>

            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => {
                const selected = selectedDepts.includes(dept.id)
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => toggleDept(dept.id)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-all"
                    style={{
                      background:   selected ? '#2d6a4f' : '#fff',
                      color:        selected ? '#fff'    : '#374151',
                      borderColor:  selected ? '#2d6a4f' : '#e5e7eb',
                    }}
                  >
                    {selected && (
                      <span className="mr-1">✓</span>
                    )}
                    {dept.name}
                  </button>
                )
              })}
            </div>

            {selectedDepts.length > 0 && (
              <p className="text-xs mt-3" style={{ color: '#2d6a4f' }}>
                {selectedDepts.length} department{selectedDepts.length !== 1 ? 's' : ''} selected
              </p>
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
        description={`Creating topic "${name}" mapped to ${selectedDepts.length} department(s).`}
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        loading={loading}
      />
    </>
  )
}