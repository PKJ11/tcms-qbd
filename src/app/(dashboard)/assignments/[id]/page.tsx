import { getSession } from '@/lib/auth'
import { redirect }   from 'next/navigation'
import { getAssignmentById } from '@/modules/assignments'
import { AssignmentDetailView } from '@/components/assignments/AssignmentDetailView'
import { hasAnyRole } from '@/lib/permissions'

export default async function AssignmentDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const assignment = await getAssignmentById(params.id)
  if (!assignment) redirect('/assignments')

  const isElevated = hasAnyRole(session.user, ['ADMINISTRATOR', 'VIEWER', 'TRAINER', 'GUEST_TRAINER'])
  if (!isElevated && assignment.person.id !== session.user.id) {
    redirect('/assignments')
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-3xl mx-auto">
        <a
          href="/assignments"
          className="text-sm flex items-center gap-1 mb-4"
          style={{ color: '#2d6a4f' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to my training
        </a>

        <AssignmentDetailView initialAssignment={assignment} />
      </div>
    </div>
  )
}
