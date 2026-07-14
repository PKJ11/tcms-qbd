import { getSession }              from '@/lib/auth'
import { redirect, notFound }      from 'next/navigation'
import { getQualificationById }    from '@/modules/qualification'
import { QualificationDetailView } from '@/components/qualifications/QualificationDetailView'
import {
  canManageQualifications,
  canSignQcStep,
  canSignQaStep,
} from '@/lib/permissions'

export default async function QualificationDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const qualification = await getQualificationById(params.id)
  if (!qualification) notFound()

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <a
            href="/qualifications"
            className="text-sm flex items-center gap-1 mb-4"
            style={{ color: '#2d6a4f' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to qualifications
          </a>
          <h1 className="text-2xl font-bold text-gray-900">
            {qualification.person.name} — {qualification.technique.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Evidence upload, QC sign-off, and QA final approval for this qualification record.
          </p>
        </div>

        <QualificationDetailView
          qualificationId={params.id}
          canUpload={canManageQualifications(session.user)}
          canSignQc={canSignQcStep(session.user)}
          canSignQa={canSignQaStep(session.user)}
          canReject={canManageQualifications(session.user)}
        />
      </div>
    </div>
  )
}
