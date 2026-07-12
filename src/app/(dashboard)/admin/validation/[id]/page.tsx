import { getSession }             from '@/lib/auth'
import { redirect }               from 'next/navigation'
import { getValidationRunDetail } from '@/modules/validation'
import { ValidationRunDetail }    from '@/components/validation/ValidationRunDetail'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export default async function ValidationRunPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_USERS)) redirect('/unauthorised')

  const run = await getValidationRunDetail(params.id)
  if (!run) redirect('/admin/validation')

  // Serialize Prisma result to plain object so enum types become strings
  // and Date objects become strings — safe to pass to the client component
  const serialized = JSON.parse(JSON.stringify(run)) as {
    id:          string
    phase:       string
    version:     string
    environment: string
    status:      string
    notes:       string | null
    executedBy:  { id: string; name: string } | null
    approvedBy:  { id: string; name: string } | null
    testResults: {
      id:             string
      status:         string
      actualResult:   string | null
      defectNotes:    string | null
      executedAt:     string | null
      screenshotUrls: string[]
      executedBy:     { name: string } | null
      testCase: {
        id:          string
        ursId:       string
        module:      string
        title:       string
        description: string
        steps:       string
        expected:    string
        priority:    string
      }
    }[]
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <a
            href="/admin/validation"
            className="text-sm flex items-center gap-1 mb-4"
            style={{ color: '#2d6a4f' }}
          >
            <svg
              width="14" height="14"
              viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to validation dashboard
          </a>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {serialized.phase} Validation Run
            </h1>
            <span
              className="px-2.5 py-1 rounded text-xs font-semibold"
              style={{ background: '#fefce8', color: '#854d0e' }}
            >
              {serialized.version}
            </span>
            <span
              className="px-2.5 py-1 rounded text-xs font-semibold"
              style={{ background: '#eff6ff', color: '#1d4ed8' }}
            >
              {serialized.environment}
            </span>
          </div>
        </div>

        <ValidationRunDetail run={serialized} />
      </div>
    </div>
  )
}