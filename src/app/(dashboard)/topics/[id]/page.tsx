import { getSession }       from '@/lib/auth'
import { redirect }         from 'next/navigation'
import { getTopicById, getAllDepartments, getTopicAccess } from '@/modules/topics'
import { getTopicContentStatus, TOPIC_STATUS_STYLE, TOPIC_TYPE_INFO } from '@/modules/topics/status'
import { TopicDetailView } from '@/modules/topics/TopicDetailView'
import { TopicAccessPanel } from '@/modules/topics/TopicAccessPanel'
import { TopicMaterialsList } from '@/components/content/TopicMaterialsList'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'
import { QUESTIONS_PER_ATTEMPT } from '@/modules/assessment/constants'

function StepBadge({ done }: { done: boolean }) {
  return (
    <span
      className="flex-shrink-0 w-5 h-5 rounded-full text-[11px] font-semibold flex items-center justify-center"
      style={
        done
          ? { background: '#2d6a4f', color: '#fff' }
          : { background: '#f3f4f6', color: '#9ca3af' }
      }
    >
      {done ? '✓' : ''}
    </span>
  )
}

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

  const canEdit       = hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)
  const canAssign      = hasAnyRole(session.user, PERMISSIONS.ASSIGN_TRAINING)
  const canViewReport = hasAnyRole(session.user, PERMISSIONS.VIEW_REPORTS)

  // Uploading material and creating/managing questions both gate on the same
  // topic-level access grant — only the topic's creator, or a trainer they've
  // explicitly granted access to, may do either. See TopicAccessPanel.
  const topicAccess     = canEdit ? await getTopicAccess(topic.id, session.user.id) : null
  const canManageContent = topicAccess?.canEdit ?? false

  const materialCount = topic._count.materials
  const questionCount = topic.questionBank?.currentVersion?._count.questions ?? 0
  const hasMaterial    = materialCount > 0
  const hasQuestions   = questionCount > 0

  const status      = getTopicContentStatus({
    isActive:      topic.isActive,
    trainingType:  topic.trainingType,
    materialCount,
    questionCount,
  })
  const statusStyle = TOPIC_STATUS_STYLE[status]
  const typeInfo     = TOPIC_TYPE_INFO[topic.trainingType]
  const isReady       = status === 'ACTIVE'

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
        <div className="flex items-start justify-between mb-2 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{topic.name}</h1>
            {topic.description && (
              <p className="text-sm text-gray-500 mt-1">{topic.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: statusStyle.bg, color: statusStyle.color }}
            >
              {statusStyle.label}
            </span>
          </div>
        </div>

        {/* Access to this topic — controls who can upload material and create/manage questions */}
        {canEdit && <TopicAccessPanel topicId={topic.id} />}

        {/* Pending explanation banner */}
        {status === 'PENDING' && canEdit && (
          <div
            className="flex items-start gap-2 text-xs px-4 py-3 rounded-lg mb-6"
            style={{ background: '#fffbeb', color: '#92400e' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>
              This topic is <strong>Pending</strong> and cannot be assigned yet. Complete the setup
              steps below — for a <strong>{typeInfo.shortLabel}</strong> topic that means: {typeInfo.steps.join('; ')}.
            </span>
          </div>
        )}

        {/* Primary actions — view report, assign training */}
        {(canViewReport || (topic.isActive && canAssign)) && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {canViewReport && (
              <a
                href={`/topics/${topic.id}/report`}
                className="px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2"
                style={{ borderColor: '#e5e7eb', color: '#374151' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18"/>
                  <path d="M18 17V9M13 17V5M8 17v-3"/>
                </svg>
                View training report
              </a>
            )}
            {topic.isActive && canAssign && (
              isReady ? (
                <a
                  href={`/assignments/new?topicId=${topic.id}`}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
                  style={{ background: '#2d6a4f' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Assign training
                </a>
              ) : (
                <span
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-not-allowed"
                  style={{ background: '#f3f4f6', color: '#9ca3af' }}
                  title="Complete the setup steps below before this topic can be assigned"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Assign training — setup incomplete
                </span>
              )
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Materials',   value: materialCount             },
            { label: 'Assignments', value: topic._count.assignments  },
            { label: 'Questions',   value: questionCount             },
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

        {/* Scope + training type */}
        <div
          className="bg-white rounded-xl border p-5 mb-4"
          style={{ borderColor: '#e5e7eb' }}
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-700">
              Compulsory for
            </h2>
            <span
              className="px-2.5 py-1 rounded text-xs font-semibold"
              style={{ background: '#fefce8', color: '#854d0e' }}
            >
              {typeInfo.shortLabel}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-3">{typeInfo.description}</p>
          <div className="flex flex-wrap gap-2">
            {topic.topicScopes.map((ts, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: '#eff6ff', color: '#1d4ed8' }}
              >
                {ts.department.name}
                {ts.unit ? ` → ${ts.unit.name}` : ''}
                {ts.section ? ` → ${ts.section.name}` : ''}
              </span>
            ))}
          </div>
        </div>

        {/* ── ACKNOWLEDGEMENT_ONLY: no material/assessment steps needed ── */}
        {topic.trainingType === 'ACKNOWLEDGEMENT_ONLY' && (
          <div
            className="bg-white rounded-xl border p-5 mb-4 flex items-start gap-3"
            style={{ borderColor: '#e5e7eb' }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: '#f0fdf4' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-1">
                Acknowledgement-only topic
              </h2>
              <p className="text-xs text-gray-500">
                No material upload or assessment is needed — trainees complete this topic
                by clicking Acknowledge. This topic is ready to assign as soon as it&apos;s created.
              </p>
            </div>
          </div>
        )}

        {/* ── Materials step — shown for MATERIAL_MCQ and MATERIAL_ONLY ── */}
        {topic.trainingType !== 'ACKNOWLEDGEMENT_ONLY' && (
          <div
            className="bg-white rounded-xl border p-5 mb-4"
            style={{ borderColor: '#e5e7eb' }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {topic.trainingType === 'MATERIAL_MCQ' && <StepBadge done={hasMaterial} />}
                <h2 className="text-sm font-semibold text-gray-700">
                  {topic.trainingType === 'MATERIAL_MCQ' ? 'Step 1 · Training materials' : 'Training materials'}
                </h2>
              </div>
              {canEdit && (
                canManageContent ? (
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
                ) : (
                  <span
                    title={`${topicAccess?.owner.name} has not granted you access to upload material for this topic`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-not-allowed"
                    style={{ background: '#f3f4f6', color: '#9ca3af' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Upload for this topic
                  </span>
                )
              )}
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {topic.trainingType === 'MATERIAL_MCQ'
                ? 'Required first — assessment questions unlock once at least one material is uploaded.'
                : 'Required — this topic completes once a trainee opens the material.'}
            </p>

            <TopicMaterialsList
              topicId={topic.id}
              materials={topic.materials}
              canEdit={canEdit}
              canUpload={canManageContent}
            />
          </div>
        )}

        {/* ── Assessment step — MATERIAL_MCQ only ── */}
        {topic.trainingType === 'MATERIAL_MCQ' && (
          hasMaterial ? (
            <div
              className="bg-white rounded-xl border p-5 mb-4"
              style={{ borderColor: '#e5e7eb' }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <StepBadge done={hasQuestions} />
                  <h2 className="text-sm font-semibold text-gray-700">
                    Step 2 · Assessment questions
                  </h2>
                </div>
                {canEdit && (
                  canManageContent ? (
                    <a
                      href={
                        topic.questionBank
                          ? `/assessments/banks/${topic.questionBank.id}`
                          : `/assessments/banks/new?topicId=${topic.id}`
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5"
                      style={{ background: '#2d6a4f' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      {topic.questionBank ? 'Manage questions' : 'Add question'}
                    </a>
                  ) : (
                    <span
                      title={`${topicAccess?.owner.name} has not granted you access to manage questions for this topic`}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-not-allowed"
                      style={{ background: '#f3f4f6', color: '#9ca3af' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      {topic.questionBank ? 'Manage questions' : 'Add question'}
                    </span>
                  )
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Required — add at least {QUESTIONS_PER_ATTEMPT} questions so this topic can be assigned.
              </p>

              {topic.questionBank ? (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {[
                    { label: 'Questions',          value: questionCount },
                    { label: 'Pass mark',          value: `${topic.questionBank.passingPercentage}%` },
                    { label: 'Max attempts',       value: topic.questionBank.maxAttempts             },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                      <div className="font-semibold text-gray-800">{value}</div>
                    </div>
                  ))}
                  {topic.questionBank.currentVersion && (
                    <div className="col-span-3">
                      <span
                        className="px-2.5 py-1 rounded text-xs font-semibold"
                        style={{ background: '#eff6ff', color: '#1d4ed8' }}
                      >
                        Current version v{topic.questionBank.currentVersion.versionNo} ({topic.questionBank.currentVersion.versionLabel})
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No questions yet.</p>
              )}
            </div>
          ) : (
            <div
              className="rounded-xl border border-dashed p-5 mb-4 flex items-center gap-3"
              style={{ borderColor: '#e5e7eb', background: '#fafafa' }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#f3f4f6' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-500">
                  Step 2 · Assessment questions — locked
                </h2>
                <p className="text-xs text-gray-400">
                  Upload a training material above to unlock adding assessment questions.
                </p>
              </div>
            </div>
          )
        )}

        {/* Edit actions */}
        {canEdit && (
          <TopicDetailView topic={topic} departments={departments} />
        )}

      </div>
    </div>
  )
}
