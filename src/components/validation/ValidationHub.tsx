'use client'

import { useState } from 'react'
import { RTMView }            from './RTMView'
import { ValidationRunsList } from './ValidationRunsList'

export function ValidationHub() {
  const [tab, setTab] = useState<'rtm' | 'runs'>('rtm')

  return (
    <>
      <div className="flex gap-2 mb-6 p-1 rounded-lg w-fit" style={{ background: '#e5e7eb' }}>
        {[
          { key: 'rtm',  label: 'Requirements Traceability Matrix' },
          { key: 'runs', label: 'Validation Runs'                  },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'rtm' | 'runs')}
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

      {tab === 'rtm'  && <RTMView />}
      {tab === 'runs' && <ValidationRunsList />}
    </>
  )
}