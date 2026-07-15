'use client'

import { useState } from 'react'
import { TrainingMatrixReport }      from './TrainingMatrixReport'
import { OverdueReport }             from './OverdueReport'
import { QualificationStatusReport } from './QualificationStatusReport'
import { TrainingIndexReport }       from './TrainingIndexReport'
import { TopicCompletionReport }     from './TopicCompletionReport'
import { AttendanceChart }           from './AttendanceChart'
import { OrgFilterBar, EMPTY_ORG_FILTER, type OrgFilterValue } from '@/components/shared/OrgFilterBar'
import type { AppRole } from '@/lib/types'

interface Props {
  roles:            AppRole[]
  userId:           string
  canViewAll:       boolean   // Training Head and above — org-wide "All data"
  directReportIds:  string[]  // "My reportees" — direct reports only
  teamIds:          string[]  // "My team" — direct reports + their reports, to the end
}

export type ReportScope = 'all' | 'team' | 'reportees'

type ReportTab =
  | 'matrix'
  | 'overdue'
  | 'qualification'
  | 'training-index'
  | 'topic-completion'
  | 'attendance-chart'

const ALL_TABS = [
  { key: 'matrix',            label: 'Training Matrix'      },
  { key: 'overdue',           label: 'Overdue Report'       },
  { key: 'qualification',     label: 'Qualification Status' },
  { key: 'training-index',    label: 'Training Index'       },
  { key: 'topic-completion',  label: 'Topic Completion'     },
  { key: 'attendance-chart',  label: 'Attendance Chart'     },
] as const

const SCOPE_TABS: { key: ReportScope; label: string; description: string }[] = [
  { key: 'all',       label: 'All data',      description: 'Organisation-wide — everyone, and who assigned each training' },
  { key: 'team',      label: 'My team',       description: 'Your reports, and their reports, all the way down' },
  { key: 'reportees', label: 'My reportees',  description: 'Only the people who report to you directly' },
]

export function ReportsHub({ roles, userId, canViewAll, directReportIds, teamIds }: Props) {
  const [activeTab, setActiveTab] = useState<ReportTab>('matrix')
  const [scope,     setScope]     = useState<ReportScope>(canViewAll ? 'all' : 'team')
  const [orgFilter, setOrgFilter] = useState<OrgFilterValue>(EMPTY_ORG_FILTER)

  const visibleScopeTabs = SCOPE_TABS.filter((s) => s.key !== 'all' || canViewAll)
  const scopedIds = scope === 'team' ? teamIds : scope === 'reportees' ? directReportIds : []
  const isOrgWide = scope === 'all'

  function handleScopeChange(next: ReportScope) {
    setScope(next)
    if (next !== 'all') setOrgFilter(EMPTY_ORG_FILTER)
  }

  return (
    <>
      {/* Scope selector — All data / My team / My reportees */}
      <div
        className="flex gap-1 mb-3 bg-white rounded-xl border p-1 max-w-xl"
        style={{ borderColor: '#e5e7eb' }}
      >
        {visibleScopeTabs.map((s) => (
          <button
            key={s.key}
            onClick={() => handleScopeChange(s.key)}
            title={s.description}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
            style={{
              background: scope === s.key ? '#1d4ed8' : 'transparent',
              color:      scope === s.key ? '#fff'    : '#6b7280',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Scope banner for team/reportees views */}
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
            Showing data for{' '}
            <strong>
              {scopedIds.length} {scope === 'team' ? 'team member' : 'direct report'}{scopedIds.length !== 1 ? 's' : ''}
            </strong>
            {scope === 'team' ? ' (your reports, and theirs, all the way down).' : ' (direct reports only).'}
            {!canViewAll && ' Training Head and above can see org-wide data.'}
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

      {/* Department → Unit → Section filter — org-wide "All data" scope only */}
      {isOrgWide && (activeTab === 'matrix' || activeTab === 'overdue' || activeTab === 'qualification' || activeTab === 'topic-completion') && (
        <OrgFilterBar value={orgFilter} onChange={setOrgFilter} />
      )}

      {/* Report content */}
      {activeTab === 'matrix'        && (
        <TrainingMatrixReport scope={scope} orgFilter={orgFilter} />
      )}
      {activeTab === 'overdue'       && (
        <OverdueReport scope={scope} orgFilter={orgFilter} />
      )}
      {activeTab === 'qualification' && (
        <QualificationStatusReport scope={scope} orgFilter={orgFilter} />
      )}
      {activeTab === 'training-index' && (
        <TrainingIndexReport
          userId={userId}
          roles={roles}
          scope={scope}
          scopedIds={scopedIds}
        />
      )}
      {activeTab === 'topic-completion' && (
        <TopicCompletionReport scope={scope} orgFilter={orgFilter} />
      )}
      {activeTab === 'attendance-chart' && (
        <AttendanceChart />
      )}
    </>
  )
}
