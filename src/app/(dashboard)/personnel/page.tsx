import { PersonnelList } from '@/components/personnel/PersonnelList'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function PersonnelPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const canCreate = ['TRAINING_HEAD', 'SUPER_ADMIN'].includes(session.user.role)

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-7xl mx-auto">

        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Personnel
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              All staff in the organisation. URS-PER-001.
            </p>
          </div>
          {canCreate && (
            <a
              href="/personnel/new"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 bg-[#2d6a4f]"
              
           >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add person
            </a>
          )}
        </div>

        <PersonnelList canCreate={canCreate} />
      </div>
    </div>
  )
}