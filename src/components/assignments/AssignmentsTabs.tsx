'use client'

import { useState } from 'react'
import { MyAssignmentsList }         from './MyAssignmentsList'
import { AllAssignmentsList }        from './AllAssignmentsList'
import { MyAssignedTrainingsStatus } from './MyAssignedTrainingsStatus'

export function AssignmentsTabs({
  canMonitor,
  isManager,
  canAssign,
}: {
  canMonitor: boolean
  isManager:  boolean
  canAssign?: boolean
}) {
  const [tab, setTab] = useState<'mine' | 'all' | 'assigned'>('mine')

  // If user cannot monitor others and cannot assign, just show their own — no tabs needed
  if (!canMonitor && !canAssign) {
    return <MyAssignmentsList />
  }

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-2 mb-5 p-1 rounded-lg w-fit" style={{ background: '#e5e7eb' }}>
        <button
          onClick={() => setTab('mine')}
          className="px-4 py-2 rounded-md text-sm font-medium transition-all"
          style={{
            background: tab === 'mine' ? '#fff' : 'transparent',
            color:      tab === 'mine' ? '#2d6a4f' : '#6b7280',
            boxShadow:  tab === 'mine' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          My Training
        </button>
        {canMonitor && (
          <button
            onClick={() => setTab('all')}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: tab === 'all' ? '#fff' : 'transparent',
              color:      tab === 'all' ? '#2d6a4f' : '#6b7280',
              boxShadow:  tab === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {isManager ? 'My Team' : 'All Assignments'}
          </button>
        )}
        {canAssign && (
          <button
            onClick={() => setTab('assigned')}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: tab === 'assigned' ? '#fff' : 'transparent',
              color:      tab === 'assigned' ? '#2d6a4f' : '#6b7280',
              boxShadow:  tab === 'assigned' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            Assigned By Me
          </button>
        )}
      </div>

      {tab === 'mine'     && <MyAssignmentsList />}
      {tab === 'all'      && <AllAssignmentsList isManager={isManager} />}
      {tab === 'assigned' && <MyAssignedTrainingsStatus />}
    </>
  )
}
