import { getSession } from '@/lib/auth'
import { redirect }   from 'next/navigation'
import { getDepartmentTree } from '@/modules/organization'
import { OrganizationManager } from '@/components/admin/OrganizationManager'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export default async function OrganizationPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_ORG)) redirect('/unauthorised')

  const departments = await getDepartmentTree()

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Structure</h1>
          <p className="text-sm text-gray-500 mt-1">
            Add Departments, Units and Sections. Select a Department to see its Units, then
            a Unit to see its Sections. Units and Sections cannot be removed once created.
            A Department can be deactivated only when it has no active units or members.
          </p>
        </div>

        <OrganizationManager departments={departments} />
      </div>
    </div>
  )
}
