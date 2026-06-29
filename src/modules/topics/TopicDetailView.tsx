'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'

interface Department {
  id:   string
  name: string
  unit: { id: string; name: string }
}

interface Topic {
  id:   string
  name: string
  isActive: boolean
  topicDepartments: {
    department: { id: string; name: string; unit: { id: string; name: string } }
  }[]
}

interface Props {
  topic:       Topic
  departments: Department[]
}

type ActionType = 'deactivate' | 'edit-departments' | null

export function TopicDetailView({ topic, departments }: Props) {
  const router = useRouter()

  const [action,         setAction]         = useState<ActionType>(null)
  const [selectedDepts,  setSelectedDepts]  = useState<string[]>(
    topic.topicDepartments.map((td) => td.department.id)
  )
  const [modalLoading,   setModalLoading]   = useState(false)
  const [result,         setResult]         = useState<string | null>(null)

  function toggleDept(id: string) {
    setSelectedDepts((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  async function handleConfirm(justification: string) {
    if (!action) return
    setModalLoading(true)

    const body =
      action === 'deactivate'
        ? { action: 'deactivate', justification }
        : { departmentIds: selectedDepts, justification }

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
      setResult('Departments updated successfully.')
      router.refresh()
    }
  }

  // Group departments by unit
  const deptsByUnit = departments.reduce<Record<string, {
    unit: { id: string; name: string }
    depts: Department[]
  }>>((acc, dept) => {
    const key = dept.unit.id
    if (!acc[key]) acc[key] = { unit: dept.unit, depts: [] }
    acc[key].depts.push(dept)
    return acc
  }, {})

  return (
    <>
      <div
        className="bg-white rounded-xl border p-5"
        style={{ borderColor: '#e5e7eb' }}
      >
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Actions</h2>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setAction('edit-departments')}
            className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}
          >
            Edit departments
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

      {/* Edit departments modal */}
      {action === 'edit-departments' && (
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
                Edit applicable departments
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Select departments that require this training topic.
              </p>
            </div>

            <div className="px-6 py-4 max-h-72 overflow-y-auto flex flex-col gap-4">
              {Object.values(deptsByUnit).map(({ unit, depts }) => (
                <div key={unit.id}>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {unit.name}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {depts.map((dept) => {
                      const selected = selectedDepts.includes(dept.id)
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => toggleDept(dept.id)}
                          className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-all"
                          style={{
                            background:  selected ? '#2d6a4f' : '#fff',
                            color:       selected ? '#fff'    : '#374151',
                            borderColor: selected ? '#2d6a4f' : '#e5e7eb',
                          }}
                        >
                          {selected && <span className="mr-1">✓</span>}
                          {dept.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderTop: '1px solid #f3f4f6' }}
            >
              <span className="text-xs text-gray-400">
                {selectedDepts.length} selected
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
                    if (selectedDepts.length === 0) return
                    setAction('edit-departments')
                    // Trigger justification modal by switching action type
                    // We reuse the same confirm handler
                    handleConfirm('Updated department mapping for topic')
                  }}
                  disabled={selectedDepts.length === 0}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: selectedDepts.length === 0 ? '#9ca3af' : '#2d6a4f' }}
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