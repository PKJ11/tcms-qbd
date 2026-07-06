import { getSession } from '@/lib/auth'
import { redirect }   from 'next/navigation'
import { ReportsHub } from '@/components/reports/ReportsHub'

export default async function ReportsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const allowed = ['MANAGER', 'TRAINING_HEAD', 'SUPER_ADMIN', 'MD']
  if (!allowed.includes(session.user.role)) redirect('/unauthorised')

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Inspection-ready reports. All exportable to CSV.
            URS-RPT-001 to 006.
          </p>
        </div>
        <ReportsHub
          role={session.user.role}
          userId={session.user.id}
        />
      </div>
    </div>
  )
}