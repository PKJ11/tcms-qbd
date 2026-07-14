import { getSession }     from '@/lib/auth'
import { redirect }       from 'next/navigation'
import { getActiveTopics } from '@/modules/content'
import { UploadMaterialForm } from '@/components/content/UploadMaterialForm'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export default async function UploadMaterialPage({
  searchParams,
}: {
  searchParams: { topicId?: string }
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  if (!hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)) redirect('/unauthorised')

  const topics = await getActiveTopics()

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <a
            href="/content"
            className="text-sm flex items-center gap-1 mb-4"
            style={{ color: '#2d6a4f' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to materials
          </a>
          <h1 className="text-2xl font-bold text-gray-900">
            Upload training material
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload a PPT, PDF, or video file. All uploads are version controlled. URS-CNT-001.
          </p>
        </div>

        <UploadMaterialForm topics={topics} initialTopicId={searchParams.topicId} />
      </div>
    </div>
  )
}