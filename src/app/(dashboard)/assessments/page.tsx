import { getSession } from '@/lib/auth'
import { redirect }   from 'next/navigation'
import { AssessmentsView } from '@/components/assessments/AssessmentsView'

export default async function AssessmentsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const canManage = ['TRAINER', 'TRAINING_HEAD', 'ADMINISTRATOR'].includes(session.user.role)

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-7xl mx-auto">

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Assessments
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {canManage
                ? 'Manage question banks and review attempt history. URS-ASM-001 to 006.'
                : 'Take pending assessments for your assigned training.'}
            </p>
          </div>
          {canManage && (
            <a
              href="/assessments/banks/new"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
              style={{ background: '#2d6a4f' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create question bank
            </a>
          )}
        </div>

        <AssessmentsView canManage={canManage} />
      </div>
    </div>
  )
}