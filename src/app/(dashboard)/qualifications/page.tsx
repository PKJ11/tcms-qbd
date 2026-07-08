import { getSession }          from '@/lib/auth'
import { redirect }            from 'next/navigation'
import { QualificationsView }  from '@/components/qualifications/QualificationsView'
import { getSubordinateIds }   from '@/lib/subordinates'

export default async function QualificationsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // All these roles can now access qualifications
  const allowed = ['USER', 'MANAGER', 'TRAINER', 'TRAINING_HEAD', 'ADMINISTRATOR', 'REVIEWER']
  if (!allowed.includes(session.user.role)) redirect('/unauthorised')

  const canManage  = ['TRAINER', 'TRAINING_HEAD', 'ADMINISTRATOR'].includes(session.user.role)
  const canCreate  = ['TRAINING_HEAD', 'ADMINISTRATOR'].includes(session.user.role)
  const isOrgWide  = ['TRAINING_HEAD', 'ADMINISTRATOR', 'REVIEWER'].includes(session.user.role)
  const isSubScope = ['MANAGER', 'TRAINER'].includes(session.user.role)

  // Pre-fetch subordinate count for banner
  let subordinateCount = 0
  if (isSubScope) {
    const ids = await getSubordinateIds(session.user.id)
    subordinateCount = ids.length
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-7xl mx-auto">

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Scientist Qualifications
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isOrgWide
                ? 'On-job training competency records, certificates, and the competency matrix. URS-SQF-001 to 005 · URS-CRT-001 to 003.'
                : isSubScope
                ? `Qualification records for your ${subordinateCount} direct report${subordinateCount !== 1 ? 's' : ''}. URS-SQF-001 to 005.`
                : 'Your qualification records and certificates.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <a
                href="/qualifications/techniques"
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{ borderColor: '#e5e7eb', color: '#374151' }}
              >
                Manage techniques
              </a>
            )}
            {canCreate && (
              <a
                href="/qualifications/new"
                className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
                style={{ background: '#2d6a4f' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New qualification
              </a>
            )}
          </div>
        </div>

        {/* Empty state for sub-scope with no direct reports */}
        {isSubScope && subordinateCount === 0 ? (
          <div
            className="bg-white rounded-xl border p-12 text-center"
            style={{ borderColor: '#e5e7eb' }}
          >
            <svg
              className="mx-auto mb-4"
              width="40" height="40"
              viewBox="0 0 24 24" fill="none"
              stroke="#d1d5db" strokeWidth="1.5"
            >
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              No direct reports
            </p>
            <p className="text-sm text-gray-400">
              Qualification records are scoped to your direct reports.
              You currently have no one reporting to you in the system.
            </p>
          </div>
        ) : (
          <QualificationsView
            canManage={canManage}
            canCreate={canCreate}
            currentUserId={session.user.id}
            isOrgWide={isOrgWide}
            isSubScope={isSubScope}
          />
        )}
      </div>
    </div>
  )
}