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
          <a
            href="/admin"
            className="text-sm flex items-center gap-1 mb-4"
            style={{ color: '#2d6a4f' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to admin
          </a>
          <h1 className="text-2xl font-bold text-gray-900">Organization Structure</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage Units and Sections within each Department. Departments are fixed;
            select one to see its Units, then a Unit to see its Sections.
          </p>
        </div>

        <OrganizationManager departments={departments} />
      </div>
    </div>
  )
}
