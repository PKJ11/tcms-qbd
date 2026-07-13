import { getSession } from '@/lib/auth'
import { redirect }   from 'next/navigation'
import { prisma }     from '@/lib/prisma'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'
import { getSubordinateIds, getTeamIds, REPORT_OVERSIGHT_ROLES } from '@/lib/subordinates'
import { TopicReportView } from '@/components/topics/TopicReportView'

export default async function TopicReportPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  if (!hasAnyRole(session.user, PERMISSIONS.VIEW_REPORTS)) redirect('/unauthorised')

  const topic = await prisma.trainingTopic.findUnique({
    where:  { id: params.id },
    select: { id: true, name: true },
  })
  if (!topic) redirect('/topics')

  const canViewAll = hasAnyRole(session.user, REPORT_OVERSIGHT_ROLES)

  const [directReportIds, teamIds] = await Promise.all([
    getSubordinateIds(session.user.id),
    getTeamIds(session.user.id),
  ])

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-5xl mx-auto">

        <a
          href={`/topics/${topic.id}`}
          className="text-sm flex items-center gap-1 mb-4"
          style={{ color: '#2d6a4f' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to topic
        </a>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{topic.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Training report — who has done this training, who assigned it, and current status.
          </p>
        </div>

        <TopicReportView
          topicId={topic.id}
          canViewAll={canViewAll}
          directReportIds={directReportIds}
          teamIds={teamIds}
        />
      </div>
    </div>
  )
}
