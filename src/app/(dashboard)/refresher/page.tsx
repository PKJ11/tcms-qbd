import { getSession } from '@/lib/auth'
import { redirect }   from 'next/navigation'
import { RefresherView } from '@/components/refresher/RefresherView'

export default async function RefresherPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const canTrigger = ['TRAINING_HEAD', 'SUPER_ADMIN'].includes(session.user.role)

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-7xl mx-auto">

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Refresher Training
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Planned and deviation/incident-triggered refresher training. URS-RFR-001 to 003.
            </p>
          </div>
          {canTrigger && (
            <a
              href="/refresher/new"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
              style={{ background: '#2d6a4f' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Trigger refresher
            </a>
          )}
        </div>

        <RefresherView canTrigger={canTrigger} />
      </div>
    </div>
  )
}