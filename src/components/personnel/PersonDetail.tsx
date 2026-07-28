'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'

interface Person {
  id:       string
  name:     string
  isActive: boolean
  isLocked: boolean
}

type ActionType = 'deactivate' | 'reset-password' | 'unlock' | null

export function PersonDetail({ person }: { person: Person }) {
  const router = useRouter()
  const [action,       setAction]       = useState<ActionType>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [result,       setResult]       = useState<string | null>(null)

  const modalConfig: Record<
    NonNullable<ActionType>,
    { title: string; description: string }
  > = {
    deactivate: {
      title:       `Deactivate ${person.name}`,
      description: 'This person will lose access to TCMS. All records are retained.',
    },
    'reset-password': {
      title:       `Reset password for ${person.name}`,
      description: 'A new temporary password will be generated and emailed to the person.',
    },
    unlock: {
      title:       `Unlock account for ${person.name}`,
      description: 'This account was locked after 3 failed login attempts. Unlocking will let them sign in again.',
    },
  }

  async function handleConfirm(justification: string, password?: string) {
    if (!action) return
    setModalLoading(true)

    const res = await fetch(`/api/personnel/${person.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action, justification, password }),
    })

    const data = await res.json()
    setModalLoading(false)
    setAction(null)

    if (!res.ok) {
      setResult(`Error: ${data.message}`)
      return
    }

    if (action === 'reset-password' && data.tempPassword) {
      setResult(`New temporary password: ${data.tempPassword}`)
    } else if (action === 'unlock') {
      setResult('Account unlocked successfully.')
      router.refresh()
    } else {
      router.push('/personnel')
      router.refresh()
    }
  }

  return (
    <>
      <div
        className="bg-white rounded-2xl border p-6"
        style={{ borderColor: '#e5e7eb' }}
      >
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Actions
        </h2>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setAction('reset-password')}
            className="px-4 py-2 rounded-lg text-sm border font-medium transition-colors"
            style={{ borderColor: '#e5e7eb', color: '#374151' }}
          >
            Reset password
          </button>

          {person.isLocked && (
            <button
              onClick={() => setAction('unlock')}
              className="px-4 py-2 rounded-lg text-sm border font-medium transition-colors"
              style={{ borderColor: '#fde68a', color: '#854d0e' }}
            >
              Unlock account
            </button>
          )}

          {person.isActive && (
            <button
              onClick={() => setAction('deactivate')}
              className="px-4 py-2 rounded-lg text-sm border font-medium transition-colors"
              style={{ borderColor: '#fecaca', color: '#dc2626' }}
            >
              Deactivate account
            </button>
          )}
        </div>

        {result && (
          <div
            className="mt-4 text-sm px-4 py-3 rounded-lg border font-mono"
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

      <JustificationModal
        isOpen={!!action}
        title={action ? modalConfig[action].title : ''}
        description={action ? modalConfig[action].description : ''}
        onConfirm={handleConfirm}
        onCancel={() => setAction(null)}
        loading={modalLoading}
        requirePassword
      />
    </>
  )
}