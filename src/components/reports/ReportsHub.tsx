'use client'

import { useState } from 'react'
import { TrainingMatrixReport }      from './TrainingMatrixReport'
import { OverdueReport }             from './OverdueReport'
import { QualificationStatusReport } from './QualificationStatusReport'
import { TrainingIndexReport }       from './TrainingIndexReport'

interface Props {
  role:            string
  userId:          string
  isOrgWide:       boolean
  subordinateIds:  string[]
}

type ReportTab =
  | 'matrix'
  | 'overdue'
  | 'qualification'
  | 'training-index'

// All roles now see all tabs
// Data is scoped server-side per role
const ALL_TABS = [
  { key: 'matrix',         label: 'Training Matrix'      },
  { key: 'overdue',        label: 'Overdue Report'       },
  { key: 'qualification',  label: 'Qualification Status' },
  { key: 'training-index', label: 'Training Index'       },
] as const

export function ReportsHub({ role, userId, isOrgWide, subordinateIds }: Props) {
  const [activeTab, setActiveTab] = useState<ReportTab>('matrix')

  return (
    <>
      {/* Scope banner for managers/trainers */}
      {!isOrgWide && (
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
            Showing data for your <strong>{subordinateIds.length} direct report{subordinateIds.length !== 1 ? 's' : ''}</strong> only.
            Training Head and above can see org-wide data.
          </span>
        </div>
      )}

      {/* Tab bar */}
      <div
        className="flex gap-1 mb-6 bg-white rounded-xl border p-1"
        style={{ borderColor: '#e5e7eb' }}
      >
        {ALL_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.key ? '#2d6a4f' : 'transparent',
              color:      activeTab === tab.key ? '#fff'    : '#6b7280',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report content */}
      {activeTab === 'matrix'        && (
        <TrainingMatrixReport isOrgWide={isOrgWide} />
      )}
      {activeTab === 'overdue'       && (
        <OverdueReport isOrgWide={isOrgWide} />
      )}
      {activeTab === 'qualification' && (
        <QualificationStatusReport isOrgWide={isOrgWide} />
      )}
      {activeTab === 'training-index' && (
        <TrainingIndexReport
          userId={userId}
          role={role}
          isOrgWide={isOrgWide}
          subordinateIds={subordinateIds}
        />
      )}
    </>
  )
}