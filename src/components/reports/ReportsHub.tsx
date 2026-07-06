'use client'

import { useState } from 'react'
import { TrainingMatrixReport }       from './TrainingMatrixReport'
import { OverdueReport }              from './OverdueReport'
import { QualificationStatusReport }  from './QualificationStatusReport'
import { TrainingIndexReport }        from './TrainingIndexReport'

interface Props {
  role:   string
  userId: string
}

type ReportTab =
  | 'matrix'
  | 'overdue'
  | 'qualification'
  | 'training-index'

const ALL_TABS = [
  { key: 'matrix',         label: 'Training Matrix',        roles: ['MANAGER', 'TRAINING_HEAD', 'SUPER_ADMIN', 'MD']    },
  { key: 'overdue',        label: 'Overdue Report',         roles: ['MANAGER', 'TRAINING_HEAD', 'SUPER_ADMIN', 'MD']    },
  { key: 'qualification',  label: 'Qualification Status',   roles: ['TRAINING_HEAD', 'SUPER_ADMIN', 'MD']               },
  { key: 'training-index', label: 'Training Index',         roles: ['MANAGER', 'TRAINING_HEAD', 'SUPER_ADMIN', 'MD']    },
] as const

export function ReportsHub({ role, userId }: Props) {
  const availableTabs = ALL_TABS.filter((t) =>
    (t.roles as readonly string[]).includes(role)
  )

  const [activeTab, setActiveTab] = useState<ReportTab>(
    availableTabs[0]?.key ?? 'matrix'
  )

  return (
    <>
      {/* Tab bar */}
      <div
        className="flex gap-1 mb-6 bg-white rounded-xl border p-1"
        style={{ borderColor: '#e5e7eb' }}
      >
        {availableTabs.map((tab) => (
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
      {activeTab === 'matrix'         && <TrainingMatrixReport />}
      {activeTab === 'overdue'        && <OverdueReport />}
      {activeTab === 'qualification'  && <QualificationStatusReport />}
      {activeTab === 'training-index' && <TrainingIndexReport userId={userId} role={role} />}
    </>
  )
}