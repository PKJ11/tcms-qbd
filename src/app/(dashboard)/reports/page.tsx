import { getSession }      from '@/lib/auth'
import { redirect }        from 'next/navigation'
import { ReportsHub }      from '@/components/reports/ReportsHub'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export default async function ReportsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  if (!hasAnyRole(session.user, PERMISSIONS.VIEW_REPORTS)) redirect('/unauthorised')

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Organisation-wide reports. All exportable to CSV. URS-RPT-001 to 006.
          </p>
        </div>

        <ReportsHub
          roles={session.user.roles}
          userId={session.user.id}
          isOrgWide={true}
          subordinateIds={[]}
        />
      </div>
    </div>
  )
}