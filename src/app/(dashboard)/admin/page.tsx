import { getSession } from '@/lib/auth'
import { redirect }   from 'next/navigation'
import { TrainerCertificatesAdmin } from '@/components/admin/TrainerCertificatesAdmin'
import { OverdueScanAdmin } from '@/components/admin/OverdueScanAdmin'
import { FlaggedPersonsAdmin } from '@/components/admin/FlaggedPersonsAdmin'

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const allowed = ['TRAINING_HEAD', 'SUPER_ADMIN']
  if (!allowed.includes(session.user.role)) redirect('/unauthorised')

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
          <p className="text-sm text-gray-500 mt-1">
            System configuration and compliance management.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <TrainerCertificatesAdmin />
          <FlaggedPersonsAdmin />

        </div>
        <OverdueScanAdmin />
      </div>
    </div>
  )
}