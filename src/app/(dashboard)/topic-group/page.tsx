import { getSession } from '@/lib/auth'
import { redirect }   from 'next/navigation'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'
import { TopicGroupPageView } from '@/components/topic-groups/TopicGroupPageView'

export default async function TopicGroupPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_TOPIC_GROUPS)) redirect('/unauthorised')

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Topic Group</h1>
          <p className="text-sm text-gray-500 mt-1">
            View your team and curate department induction topic bundles — every new joinee of a
            department automatically receives that department's topic group as induction training,
            due one month from their joining date.
          </p>
        </div>

        <TopicGroupPageView />
      </div>
    </div>
  )
}
