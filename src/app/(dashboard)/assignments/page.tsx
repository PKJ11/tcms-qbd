import { getSession } from '@/lib/auth'
import { redirect }   from 'next/navigation'
import { personHasSubordinates } from '@/modules/assignments'
import { AssignmentsTabs } from '@/components/assignments/AssignmentsTabs'

export default async function AssignmentsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const canAssign = ['TRAINING_HEAD', 'ADMINISTRATOR'].includes(session.user.role)
  const isOrgWide = ['TRAINING_HEAD', 'ADMINISTRATOR', 'REVIEWER'].includes(session.user.role)

  // Check REAL subordinates, not just role label
  const hasSubordinates = isOrgWide || await personHasSubordinates(session.user.id)

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-7xl mx-auto">

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Training Assignments
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {hasSubordinates
                ? `Your training, and ${isOrgWide ? 'organisation-wide monitoring' : 'your direct reports'}.`
                : 'Your assigned trainings and progress.'}
              {' '}URS-TNA-001 to 005.
            </p>
          </div>
          {canAssign && (
            <a
              href="/assignments/new"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
              style={{ background: '#2d6a4f' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Assign training
            </a>
          )}
        </div>

        <AssignmentsTabs canMonitor={hasSubordinates} isManager={!isOrgWide && hasSubordinates} />
      </div>
    </div>
  )
}