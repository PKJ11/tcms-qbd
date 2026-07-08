'use client'

import { useState } from 'react'
import { QualificationsList } from './QualificationsList'
import { CompetencyMatrix }   from './CompetencyMatrix'

interface Props {
  canManage:     boolean
  canCreate:     boolean
  currentUserId: string
  isOrgWide:     boolean
  isSubScope:    boolean
}

export function QualificationsView({
  canManage,
  canCreate,
  currentUserId,
  isOrgWide,
  isSubScope,
}: Props) {
  const [tab, setTab] = useState<'records' | 'matrix'>('records')

  return (
    <>
      {/* Scope banner */}
      {isSubScope && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-4 text-sm"
          style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/>
            <path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
          <span>
            Showing qualification records for your <strong>direct reports only</strong>.
            Training Head and above can see org-wide records.
          </span>
        </div>
      )}

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
              background: tab === t.key ? '#fff'    : 'transparent',
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
          isOrgWide={isOrgWide}
          isSubScope={isSubScope}
        />
      ) : (
        <CompetencyMatrix
          isOrgWide={isOrgWide}
          isSubScope={isSubScope}
        />
      )}
    </>
  )
}