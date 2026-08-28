import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDepartmentsUnitsAndSections } from '@/modules/personnel'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'
import { OrgStructureExplorer } from '@/components/organization/OrgStructureExplorer'

export default async function OrganizationPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!hasAnyRole(session.user, PERMISSIONS.VIEW_PERSONNEL)) redirect('/unauthorised')

  const departments = await getDepartmentsUnitsAndSections()

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Organization Structure</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse departments, units and sections. Select any node to see its members and their managers.
          </p>
        </div>

        <OrgStructureExplorer departments={departments} />
      </div>
    </div>
  )
}
