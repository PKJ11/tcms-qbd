import { getSession }    from '@/lib/auth'
import { redirect }      from 'next/navigation'
import { getActiveTopicsForAssignment } from '@/modules/assignments'
import { AssignTrainingForm } from '@/components/assignments/AssignTrainingForm'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export default async function NewAssignmentPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  if (!hasAnyRole(session.user, PERMISSIONS.ASSIGN_TRAINING)) redirect('/unauthorised')

  const topics = await getActiveTopicsForAssignment()

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <a
            href="/assignments"
            className="text-sm flex items-center gap-1 mb-4"
            style={{ color: '#2d6a4f' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to assignments
          </a>
          <h1 className="text-2xl font-bold text-gray-900">Assign training</h1>
          <p className="text-sm text-gray-500 mt-1">
            Assign to an entire department in one action, or individually. URS-TNA-003 to 005.
          </p>
        </div>

        <AssignTrainingForm topics={topics} />
      </div>
    </div>
  )
}