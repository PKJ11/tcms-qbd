import { getSession }       from '@/lib/auth'
import { redirect }         from 'next/navigation'
import { getTopicById, getAllDepartments } from '@/modules/topics'
import { formatDate }       from '@/lib/utils'
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
      <div className="max-w-4xl mx-auto">

        {/* Back link */}
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

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
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

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Materials',   value: topic._count.materials   },
            { label: 'Assignments', value: topic._count.assignments },
            { label: 'Questions',   value: topic.questionBank?._count.questions ?? 0 },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-white rounded-xl border p-4 text-center"
              style={{ borderColor: '#e5e7eb' }}
            >
              <div className="text-3xl font-bold text-gray-900">{value}</div>
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

        {/* Materials section */}
        <div
          className="bg-white rounded-xl border p-5 mb-4"
          style={{ borderColor: '#e5e7eb' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">
              Training materials
            </h2>
            {canEdit && (
              <a
                href={`/content/upload?topicId=${topic.id}`}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5"
                style={{ background: '#2d6a4f' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload for this topic
              </a>
            )}
          </div>

          {topic.materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <p className="text-sm text-gray-400">No materials uploaded yet</p>
              {canEdit && (
                <a
                  href={`/content/upload?topicId=${topic.id}`}
                  className="text-xs font-medium mt-1"
                  style={{ color: '#2d6a4f' }}
                >
                  Upload the first material →
                </a>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {topic.materials.map((material) => {
                const statusStyle =
                  material.status === 'APPROVED'
                    ? { background: '#f0fdf4', color: '#166534' }
                    : material.status === 'RETIRED'
                    ? { background: '#f9fafb', color: '#6b7280' }
                    : { background: '#fefce8', color: '#854d0e' }

                return (
                  <div
                    key={material.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    style={{ borderColor: '#f3f4f6', background: '#fafafa' }}
                  >
                    <div className="flex items-center gap-3">
                      {/* File icon */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: '#f0fdf4' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {material.title}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          v{material.currentVersion} &nbsp;·&nbsp;
                          <span
                            className="px-1.5 py-0.5 rounded text-xs font-semibold"
                            style={statusStyle}
                          >
                            {material.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={`/content?topicId=${topic.id}`}
                      className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                      style={{ borderColor: '#e5e7eb', color: '#374151' }}
                    >
                      View
                    </a>
                  </div>
                )
              })}
            </div>
          )}
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
                { label: 'Pass mark',          value: `${topic.questionBank.passingPercentage}%` },
                { label: 'Questions per test', value: topic.questionBank.questionsPerAttempt     },
                { label: 'Max attempts',       value: topic.questionBank.maxAttempts             },
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
          <TopicDetailView topic={topic} departments={departments} />
        )}

      </div>
    </div>
  )
}