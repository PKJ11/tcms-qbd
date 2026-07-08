import { getSession } from '@/lib/auth'
import { TopicsList } from '@/modules/topics/TopicsList'
import { redirect } from 'next/navigation'

export default async function TopicsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const canCreate = ['TRAINING_HEAD', 'ADMINISTRATOR'].includes(session.user.role)

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-7xl mx-auto">

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Training Topics
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Master list of all training subjects. URS-TOP-001.
            </p>
          </div>
          {canCreate && (
            <a
              href="/topics/new"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
              style={{ background: '#2d6a4f' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add topic
            </a>
          )}
        </div>

        <TopicsList canCreate={canCreate} />
      </div>
    </div>
  )
}