import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAllDepartments } from '@/modules/topics'
import { CreateTopicForm } from '@/modules/topics/CreateTopicForm'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'
import { getTopicFolders } from '@/modules/topics/folders'

export default async function NewTopicPage({
  searchParams,
}: {
  searchParams: { folder?: string }
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  if (!hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)) redirect('/unauthorised')

  const [departments, folders] = await Promise.all([getAllDepartments(), getTopicFolders()])

  // Opened from inside a folder ("Add topic here") → start with that folder ticked
  const fromFolder = folders.find((f) => f.id === searchParams.folder)
  const backHref   = fromFolder ? `/topics?folder=${encodeURIComponent(fromFolder.id)}` : '/topics'

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <a
            href={backHref}
            className="text-sm flex items-center gap-1 mb-4"
            style={{ color: '#2d6a4f' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            {fromFolder ? `Back to ${fromFolder.name}` : 'Back to topics'}
          </a>
          <h1 className="text-2xl font-bold text-gray-900">Add training topic</h1>
          <p className="text-sm text-gray-500 mt-1">
            Topics are mapped to departments and drive induction training. URS-TOP-002.
          </p>
        </div>

        <CreateTopicForm
          departments={departments}
          folders={folders.map((f) => ({ id: f.id, name: f.name }))}
          initialFolderIds={fromFolder ? [fromFolder.id] : []}
          cancelHref={backHref}
        />
      </div>
    </div>
  )
}
