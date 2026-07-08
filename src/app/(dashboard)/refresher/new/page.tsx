import { getSession }    from '@/lib/auth'
import { redirect }      from 'next/navigation'
import {
  getActiveTopicsForRefresher,
  getPersonsForRefresher,
} from '@/modules/refresher'
import { TriggerRefresherForm } from '@/components/refresher/TriggerRefresherForm'

export default async function NewRefresherPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const allowed = ['TRAINING_HEAD', 'ADMINISTRATOR']
  if (!allowed.includes(session.user.role)) redirect('/unauthorised')

  const [topics, persons] = await Promise.all([
    getActiveTopicsForRefresher(),
    getPersonsForRefresher(),
  ])

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <a
            href="/refresher"
            className="text-sm flex items-center gap-1 mb-4"
            style={{ color: '#2d6a4f' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to refresher training
          </a>
          <h1 className="text-2xl font-bold text-gray-900">Trigger refresher training</h1>
          <p className="text-sm text-gray-500 mt-1">
            Planned or triggered by deviation/incident review. URS-RFR-001, RFR-002.
          </p>
        </div>

        <TriggerRefresherForm topics={topics} persons={persons} />
      </div>
    </div>
  )
}