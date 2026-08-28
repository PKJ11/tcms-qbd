'use client'

import { useState } from 'react'
import { TeamOverview }     from './TeamOverview'
import { TopicGroupBuilder } from './TopicGroupBuilder'

export function TopicGroupPageView() {
  const [tab, setTab] = useState<'team' | 'groups'>('team')

  return (
    <>
      <div className="flex gap-2 mb-5 p-1 rounded-lg w-fit" style={{ background: '#e5e7eb' }}>
        {[
          { key: 'team' as const,   label: 'My Team' },
          { key: 'groups' as const, label: 'Topic Groups' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
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

      {tab === 'team' ? <TeamOverview /> : <TopicGroupBuilder />}
    </>
  )
}
