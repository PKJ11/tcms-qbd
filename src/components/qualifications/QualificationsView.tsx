'use client'

import { useState } from 'react'
import { QualificationsList }  from './QualificationsList'
import { CompetencyMatrix } from './CompetencyMatrix'

interface Props {
  canManage:     boolean
  canCreate:     boolean
  currentUserId: string
}

export function QualificationsView({ canManage, canCreate, currentUserId }: Props) {
  const [tab, setTab] = useState<'records' | 'matrix'>('records')

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-2 mb-5 p-1 rounded-lg w-fit" style={{ background: '#e5e7eb' }}>
        {[
          { key: 'records', label: 'Qualification records' },
          { key: 'matrix',  label: 'Competency matrix'    },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'records' | 'matrix')}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: tab === t.key ? '#fff' : 'transparent',
              color:      tab === t.key ? '#2d6a4f' : '#6b7280',
              boxShadow:  tab === t.key ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'records' ? (
        <QualificationsList
          canManage={canManage}
          canCreate={canCreate}
          currentUserId={currentUserId}
        />
      ) : (
        <CompetencyMatrix />
      )}
    </>
  )
}