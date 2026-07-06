import { getSession } from '@/lib/auth'
import { redirect }   from 'next/navigation'
import { AllNotificationsView } from '@/components/notifications/AllNotificationsView'

export default async function NotificationsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            All your system notifications — training assignments, due dates, assessment outcomes.
          </p>
        </div>
        <AllNotificationsView />
      </div>
    </div>
  )
}