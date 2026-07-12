import { getSession }          from '@/lib/auth'
import { redirect }            from 'next/navigation'
import { QualificationsView }  from '@/components/qualifications/QualificationsView'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export default async function QualificationsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Every authenticated user can access qualifications — Trainee/Contractual
  // Employee see only their own records; elevated roles see the org-wide view.
  const canManage = hasAnyRole(session.user, PERMISSIONS.MANAGE_QUALIFICATIONS)
  const canCreate = hasAnyRole(session.user, PERMISSIONS.MANAGE_QUALIFICATIONS)
  const isOrgWide = hasAnyRole(session.user, PERMISSIONS.VIEW_QUALIFICATIONS)

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

        <QualificationsView
          canManage={canManage}
          canCreate={canCreate}
          currentUserId={session.user.id}
          isOrgWide={isOrgWide}
          isSubScope={false}
        />
      </div>
    </div>
  )
}