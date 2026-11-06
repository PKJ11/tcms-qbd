import { getSession } from '@/lib/auth'
import { TopicsList } from '@/modules/topics/TopicsList'
import { redirect } from 'next/navigation'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'
import { getFolderOverview } from '@/modules/topics/folders'
import { FolderIcon } from '@/modules/topics/FolderPicker'

// /topics                → folder tiles (the home screen)
// /topics?folder=<id>    → the topics filed in that folder
// /topics?folder=all     → every topic
// /topics?folder=none    → topics not filed in any folder
export default async function TopicsPage({
  searchParams,
}: {
  searchParams: { folder?: string }
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const canCreate = hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)
  const { folders, unfiled, total } = await getFolderOverview()
  const folderKey = searchParams.folder?.trim() || null

  const addTopicButton = (folderId?: string) => canCreate && (
    <a
      href={folderId ? `/topics/new?folder=${encodeURIComponent(folderId)}` : '/topics/new'}
      className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 flex-shrink-0"
      style={{ background: '#2d6a4f' }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      {folderId ? 'Add topic here' : 'Add topic'}
    </a>
  )

  // ── Home: folder tiles ─────────────────────────────────────────
  if (!folderKey) {
    return (
      <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Training Topics</h1>
              <p className="text-sm text-gray-500 mt-1">
                Choose a folder to see its training topics. A topic can be in more than one folder. URS-TOP-001.
              </p>
            </div>
            {addTopicButton()}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {folders.map((f) => (
              <a
                key={f.id}
                href={`/topics?folder=${encodeURIComponent(f.id)}`}
                className="group bg-white rounded-xl border p-5 flex items-center gap-4 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ borderColor: '#e5e7eb', outlineColor: '#2d6a4f' }}
              >
                <span
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ background: '#f0fdf4', color: '#2d6a4f' }}
                >
                  <FolderIcon size={26} open={f.topicCount > 0} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-gray-900 truncate group-hover:underline">{f.name}</span>
                  <span className="block text-sm text-gray-500 tabular-nums">
                    {f.topicCount} topic{f.topicCount === 1 ? '' : 's'}
                  </span>
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" aria-hidden="true" className="flex-shrink-0">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </a>
            ))}

            {/* Every topic, regardless of folder */}
            <a
              href="/topics?folder=all"
              className="group rounded-xl border border-dashed p-5 flex items-center gap-4 transition-colors hover:bg-white"
              style={{ borderColor: '#d1d5db' }}
            >
              <span className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f3f4f6', color: '#4b5563' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-gray-700 group-hover:underline">All topics</span>
                <span className="block text-sm text-gray-500 tabular-nums">{total} topic{total === 1 ? '' : 's'}</span>
              </span>
            </a>

            {unfiled > 0 && (
              <a
                href="/topics?folder=none"
                className="group rounded-xl border border-dashed p-5 flex items-center gap-4 transition-colors hover:bg-white"
                style={{ borderColor: '#fcd34d', background: '#fffbeb' }}
              >
                <span className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fef3c7', color: '#92400e' }}>
                  <FolderIcon size={26} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold group-hover:underline" style={{ color: '#92400e' }}>No folder</span>
                  <span className="block text-sm tabular-nums" style={{ color: '#a16207' }}>
                    {unfiled} topic{unfiled === 1 ? '' : 's'} to file
                  </span>
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Inside a folder ────────────────────────────────────────────
  const folder = folders.find((f) => f.id === folderKey)
  const title =
    folderKey === 'all'  ? 'All topics' :
    folderKey === 'none' ? 'No folder'  :
    folder?.name ?? null

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-7xl mx-auto">
        <a href="/topics" className="text-sm flex items-center gap-1 mb-4 w-fit" style={{ color: '#2d6a4f' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to folders
        </a>

        {!title ? (
          <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-sm text-gray-600">This folder no longer exists.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3 min-w-0">
                {folder && (
                  <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f0fdf4', color: '#2d6a4f' }}>
                    <FolderIcon size={24} open />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Training Topics</p>
                  <h1 className="text-2xl font-bold text-gray-900 truncate">{title}</h1>
                </div>
              </div>
              {addTopicButton(folder?.id)}
            </div>

            <TopicsList canCreate={canCreate} folderKey={folderKey} folderName={title} />
          </>
        )}
      </div>
    </div>
  )
}
