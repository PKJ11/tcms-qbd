import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTopicById, getAllDepartments } from '@/modules/topics'
import { TopicDetailView } from '@/modules/topics/TopicDetailView'

export default async function TopicDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const [topic, departments] = await Promise.all([
    getTopicById(params.id),
    getAllDepartments(),
  ])

  if (!topic) redirect('/topics')

  const canEdit = ['TRAINING_HEAD', 'SUPER_ADMIN'].includes(session.user.role)

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-3xl mx-auto">
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

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{topic.name}</h1>
              {topic.description && (
                <p className="text-sm text-gray-500 mt-1">{topic.description}</p>
              )}
            </div>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={
                topic.isActive
                  ? { background: '#f0fdf4', color: '#166534' }
                  : { background: '#fef2f2', color: '#dc2626' }
              }
            >
              {topic.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: 'Materials',    value: topic._count.materials   },
            { label: 'Assignments',  value: topic._count.assignments },
            { label: 'Questions',    value: topic.questionBank?._count.questions ?? 0 },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-white rounded-xl border p-4 text-center"
              style={{ borderColor: '#e5e7eb' }}
            >
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Departments */}
        <div
          className="bg-white rounded-xl border p-5 mb-4"
          style={{ borderColor: '#e5e7eb' }}
        >
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Applicable departments
          </h2>
          <div className="flex flex-wrap gap-2">
            {topic.topicDepartments.map((td) => (
              <span
                key={td.department.id}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: '#eff6ff', color: '#1d4ed8' }}
              >
                {td.department.name} · {td.department.unit.name}
              </span>
            ))}
          </div>
        </div>

        {/* Assessment bank summary */}
        {topic.questionBank && (
          <div
            className="bg-white rounded-xl border p-5 mb-4"
            style={{ borderColor: '#e5e7eb' }}
          >
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Assessment bank
            </h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[
                { label: 'Pass mark',         value: `${topic.questionBank.passingPercentage}%` },
                { label: 'Questions per test', value: topic.questionBank.questionsPerAttempt    },
                { label: 'Max attempts',       value: topic.questionBank.maxAttempts            },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                  <div className="font-semibold text-gray-800">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit actions */}
        {canEdit && (
          <TopicDetailView
            topic={topic}
            departments={departments}
          />
        )}
      </div>
    </div>
  )
}