'use client'

import { useState } from 'react'
import { TrainingMatrixReport }      from './TrainingMatrixReport'
import { OverdueReport }             from './OverdueReport'
import { QualificationStatusReport } from './QualificationStatusReport'
import { TrainingIndexReport }       from './TrainingIndexReport'
import { TopicCompletionReport }     from './TopicCompletionReport'
import { TrainingAttendanceRecord }  from './TrainingAttendanceRecord'
import { TrainersList }              from './TrainersList'
import { TrainingCalendar }          from './TrainingCalendar'
import { TrainingEvalObjectiveSheet } from './TrainingEvalObjectiveSheet'
import { SopSelfReadoutList }         from './SopSelfReadoutList'
import { OrgFilterBar, EMPTY_ORG_FILTER, type OrgFilterValue } from '@/components/shared/OrgFilterBar'
import type { AppRole } from '@/lib/types'

interface Props {
  roles:            AppRole[]
  userId:           string
  userName:         string
  canViewAll:       boolean   // Training Head and above — org-wide "All data"
  teamIds:          string[]  // "My team" — direct reports + their reports, to the end
}

export type ReportScope = 'all' | 'team' | 'reportees'

type ReportTab =
  | 'training-index'
  | 'matrix'
  | 'overdue'
  | 'qualification'
  | 'topic-completion'
  | 'training-attendance'
  | 'trainers-list'
  | 'training-calendar'
  | 'training-eval-objective'
  | 'sop-self-readout'

const CARDS: { key: ReportTab; label: string; description: string; icon: React.ReactNode }[] = [
  {
    key: 'training-index', label: 'Training Index',
    description: 'Per-person training record, printable as a controlled PDF.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    key: 'matrix', label: 'Training Matrix',
    description: 'Every person × every topic, at a glance.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    key: 'overdue', label: 'Overdue Report',
    description: 'Assignments past their due date, by person.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    key: 'qualification', label: 'Qualification Status',
    description: 'Technique-wise qualification progress and outcomes.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2">
        <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
      </svg>
    ),
  },
  {
    key: 'topic-completion', label: 'Topic Completion',
    description: 'Completion rate for each training topic.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2">
        <polyline points="9 11 12 14 22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    key: 'training-attendance', label: 'Training Attendance Record',
    description: 'Pick a topic and date — who completed it that day.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <polyline points="17 11 19 13 23 9"/>
      </svg>
    ),
  },
  {
    key: 'trainers-list', label: 'List of Trainers',
    description: 'Every trainer, with their department, unit and section.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    key: 'training-calendar', label: 'Training Calendar',
    description: 'Department-wise yearly plan — tick the month each training is given.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <polyline points="9 16 11 18 15 14"/>
      </svg>
    ),
  },
  {
    key: 'training-eval-objective', label: 'Training Evaluation Sheet for Objective Questions',
    description: 'Pick a topic — its objective questions print as a blank evaluation sheet.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    key: 'sop-self-readout', label: 'List of SOPs-Self Readout',
    description: 'Every SOP self-readout training — trainee name and completion date, or N/A if pending.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <path d="M9 15l2 2 4-4"/>
      </svg>
    ),
  },
]

const TAB_LABELS: Record<ReportTab, string> = {
  'training-index':      'Training Index',
  matrix:                'Training Matrix',
  overdue:               'Overdue Report',
  qualification:         'Qualification Status',
  'topic-completion':    'Topic Completion',
  'training-attendance': 'Training Attendance Record',
  'trainers-list':       'List of Trainers',
  'training-calendar':   'Training Calendar',
  'training-eval-objective': 'Training Evaluation Sheet for Objective Questions',
  'sop-self-readout':    'List of SOPs-Self Readout',
}

export function ReportsHub({ roles, userId, userName, canViewAll, teamIds }: Props) {
  const [openReport, setOpenReport] = useState<ReportTab | null>(null)
  const [orgFilter, setOrgFilter]   = useState<OrgFilterValue>(EMPTY_ORG_FILTER)

  // Scope is fixed by role — Training Head and above see org-wide data,
  // everyone else is scoped to their own team (reports, and theirs, down).
  const scope: ReportScope = canViewAll ? 'all' : 'team'
  const scopedIds = scope === 'team' ? teamIds : []
  const isOrgWide = scope === 'all'

  return (
    <>
      {/* Scope banner — informational only, not switchable */}
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
            Showing data for your team —{' '}
            <strong>{scopedIds.length} member{scopedIds.length !== 1 ? 's' : ''}</strong>{' '}
            (your reports, and theirs, all the way down).
          </span>
        </div>
      )}

      {openReport === null ? (
        // ── Report picker — cards, 2 per row, all the same size ────────
        <div className="grid grid-cols-2 gap-4">
          {CARDS.map((card) => (
            <button
              key={card.key}
              onClick={() => setOpenReport(card.key)}
              className="text-left bg-white rounded-2xl border p-6 flex items-start gap-3 hover:shadow-sm transition-shadow"
              style={{ borderColor: '#e5e7eb' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#f9fafb' }}
              >
                {card.icon}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{card.label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{card.description}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        // ── Opened report — full detail view ──────────────────────────
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setOpenReport(null)}
              className="text-sm flex items-center gap-1.5 font-medium"
              style={{ color: '#2d6a4f' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back to Reports
            </button>
            <span className="text-gray-300">/</span>
            <h2 className="text-sm font-semibold text-gray-700">{TAB_LABELS[openReport]}</h2>
          </div>

          {/* Department → Unit → Section filter — org-wide "All data" scope only */}
          {isOrgWide && (openReport === 'matrix' || openReport === 'overdue' || openReport === 'qualification' || openReport === 'topic-completion') && (
            <OrgFilterBar value={orgFilter} onChange={setOrgFilter} />
          )}

          {openReport === 'training-index' && (
            <TrainingIndexReport
              userId={userId}
              userName={userName}
              roles={roles}
              scope={scope}
              scopedIds={scopedIds}
            />
          )}
          {openReport === 'matrix'        && (
            <TrainingMatrixReport scope={scope} orgFilter={orgFilter} />
          )}
          {openReport === 'overdue'       && (
            <OverdueReport scope={scope} orgFilter={orgFilter} />
          )}
          {openReport === 'qualification' && (
            <QualificationStatusReport scope={scope} orgFilter={orgFilter} />
          )}
          {openReport === 'topic-completion' && (
            <TopicCompletionReport scope={scope} orgFilter={orgFilter} />
          )}
          {openReport === 'training-attendance' && (
            <TrainingAttendanceRecord scope={scope} />
          )}
          {openReport === 'trainers-list' && (
            <TrainersList />
          )}
          {openReport === 'training-calendar' && (
            <TrainingCalendar canEdit={roles.includes('TRAINER')} />
          )}
          {openReport === 'training-eval-objective' && (
            <TrainingEvalObjectiveSheet />
          )}
          {openReport === 'sop-self-readout' && (
            <SopSelfReadoutList scope={scope} />
          )}
        </div>
      )}
    </>
  )
}
