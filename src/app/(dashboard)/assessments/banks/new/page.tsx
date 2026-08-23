import { getSession }          from '@/lib/auth'
import { redirect }            from 'next/navigation'
import { getTopicsWithoutBank } from '@/modules/assessment'
import { CreateBankForm }      from '@/components/assessments/CreateBankForm'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export default async function NewBankPage({
  searchParams,
}: {
  searchParams: { topicId?: string }
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  if (!hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)) redirect('/unauthorised')

  const topics = await getTopicsWithoutBank()

  const hasTopic = !!searchParams.topicId && topics.some((t) => t.id === searchParams.topicId)

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <a
            href={hasTopic ? `/topics/${searchParams.topicId}` : '/assessments'}
            className="text-sm flex items-center gap-1 mb-4"
            style={{ color: '#2d6a4f' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            {hasTopic ? 'Back to topic' : 'Back to assessments'}
          </a>
          <h1 className="text-2xl font-bold text-gray-900">Add questions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Each topic&apos;s assessment questions are added here once. URS-ASM-001 to 003.
          </p>
        </div>

        <CreateBankForm topics={topics} initialTopicId={searchParams.topicId} />
      </div>
    </div>
  )
}