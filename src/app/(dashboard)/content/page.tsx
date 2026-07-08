import { getSession }  from '@/lib/auth'
import { redirect }    from 'next/navigation'
import { ContentList } from '@/components/content/ContentList'
import { prisma }      from '@/lib/prisma'

export default async function ContentPage({
  searchParams,
}: {
  searchParams: { topicId?: string }
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const canUpload = ['TRAINING_HEAD', 'ADMINISTRATOR'].includes(session.user.role)

  // If filtering by topic, fetch the topic name for display
  let filteredTopic: { id: string; name: string } | null = null
  if (searchParams.topicId) {
    filteredTopic = await prisma.trainingTopic.findUnique({
      where:  { id: searchParams.topicId },
      select: { id: true, name: true },
    })
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-7xl mx-auto">

        <div className="flex items-start justify-between mb-6">
          <div>
            {filteredTopic && (
              <a
                href="/content"
                className="text-xs flex items-center gap-1 mb-2"
                style={{ color: '#2d6a4f' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Clear filter — show all materials
              </a>
            )}
            <h1 className="text-2xl font-bold text-gray-900">
              {filteredTopic
                ? `Materials — ${filteredTopic.name}`
                : 'Training Materials'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {filteredTopic
                ? `Showing materials filtered to this topic only.`
                : 'Upload and manage training content with version control. URS-CNT-001 to 006.'}
            </p>
          </div>
          {canUpload && (
            <a
              href={
                filteredTopic
                  ? `/content/upload?topicId=${filteredTopic.id}`
                  : '/content/upload'
              }
              className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
              style={{ background: '#2d6a4f' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload material
            </a>
          )}
        </div>

        <ContentList
          canUpload={canUpload}
          topicId={searchParams.topicId}
        />
      </div>
    </div>
  )
}