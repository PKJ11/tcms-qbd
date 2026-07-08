import { getSession }      from '@/lib/auth'
import { redirect }        from 'next/navigation'
import { ReportsHub }      from '@/components/reports/ReportsHub'
import { getSubordinateIds } from '@/modules/reports'

export default async function ReportsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // All these roles can now access reports
  const allowed = ['MANAGER', 'TRAINER', 'TRAINING_HEAD', 'SUPER_ADMIN', 'MD']
  console.log('ReportsPage: user role', session.user.role);
  if (!allowed.includes(session.user.role)) redirect('/unauthorised')

  const isOrgWide    = ['TRAINING_HEAD', 'SUPER_ADMIN', 'MD'].includes(session.user.role)
  const isSubManager = ['MANAGER', 'TRAINER'].includes(session.user.role)

  // For MANAGER/TRAINER — pre-fetch their subordinates to pass down
  let subordinateIds: string[] = []
  if (isSubManager) {
    subordinateIds = await getSubordinateIds(session.user.id)
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isOrgWide
              ? 'Organisation-wide reports. All exportable to CSV. URS-RPT-001 to 006.'
              : `Reports scoped to your ${subordinateIds.length} direct report${subordinateIds.length !== 1 ? 's' : ''}. URS-RPT-001 to 006.`
            }
          </p>
        </div>

        {isSubManager && subordinateIds.length === 0 ? (
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
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              No direct reports found
            </p>
            <p className="text-sm text-gray-400">
              Reports are scoped to your direct reports.
              You currently have no one reporting to you in the system.
              Contact your Training Coordinator to update reporting lines.
            </p>
          </div>
        ) : (
          <ReportsHub
            role={session.user.role}
            userId={session.user.id}
            isOrgWide={isOrgWide}
            subordinateIds={subordinateIds}
          />
        )}
      </div>
    </div>
  )
}