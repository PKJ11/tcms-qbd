import { getSession }     from '@/lib/auth'
import { redirect }       from 'next/navigation'
import { ValidationHub }  from '@/components/validation/ValidationHub'

export default async function ValidationPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const allowed = ['TRAINING_HEAD', 'ADMINISTRATOR']
  if (!allowed.includes(session.user.role)) redirect('/unauthorised')

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="px-2.5 py-1 rounded text-xs font-semibold"
              style={{ background: '#fef2f2', color: '#dc2626' }}
            >
              GxP CRITICAL
            </div>
            <div
              className="px-2.5 py-1 rounded text-xs font-semibold"
              style={{ background: '#eff6ff', color: '#1d4ed8' }}
            >
              GAMP 5
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Validation Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Computer System Validation per GAMP 5 lifecycle.
            IQ / OQ / PQ test execution, RTM, and validation evidence.
            URS-VAL-001 to 004.
          </p>
        </div>
        <ValidationHub />
      </div>
    </div>
  )
}