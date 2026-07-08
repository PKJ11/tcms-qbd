import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAllDepartments } from '@/modules/topics'
import { CreateTopicForm } from '@/modules/topics/CreateTopicForm'

export default async function NewTopicPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const allowed = ['TRAINING_HEAD', 'ADMINISTRATOR']
  if (!allowed.includes(session.user.role)) redirect('/unauthorised')

  const departments = await getAllDepartments()

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <a
            href="/topics"
            className="text-sm flex items-center gap-1 mb-4"
            style={{ color: '#2d6a4f' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to topics
          </a>
          <h1 className="text-2xl font-bold text-gray-900">Add training topic</h1>
          <p className="text-sm text-gray-500 mt-1">
            Topics are mapped to departments and drive induction training. URS-TOP-002.
          </p>
        </div>

        <CreateTopicForm departments={departments} />
      </div>
    </div>
  )
}