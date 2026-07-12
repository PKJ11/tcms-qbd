import { getSession } from '@/lib/auth'
import { redirect }   from 'next/navigation'
import { TrainerCertificatesAdmin } from '@/components/admin/TrainerCertificatesAdmin'
import { FlaggedPersonsAdmin }      from '@/components/admin/FlaggedPersonsAdmin'
import { OverdueScanAdmin }         from '@/components/admin/OverdueScanAdmin'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_USERS)) redirect('/unauthorised')

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
          <p className="text-sm text-gray-500 mt-1">
            System configuration, compliance management, and validation.
          </p>
        </div>

        {/* Validation quick access */}
        <a
          href="/admin/validation"
          className="flex items-center justify-between bg-white rounded-xl border p-5 mb-6 hover:shadow-sm transition-shadow"
          style={{ borderColor: '#e5e7eb' }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#eff6ff' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2">
                <polyline points="9 11 12 14 22 4"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Validation Dashboard — GAMP 5
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                RTM, IQ/OQ/PQ execution, test evidence, validation reports. URS-VAL-001 to 004.
              </div>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </a>

        {/* Organization structure quick access */}
        <a
          href="/admin/organization"
          className="flex items-center justify-between bg-white rounded-xl border p-5 mb-6 hover:shadow-sm transition-shadow"
          style={{ borderColor: '#e5e7eb' }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#f0fdf4' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Organization Structure
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Manage Units and Sections within each Department.
              </div>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </a>

        <div className="flex flex-col gap-6">
          <TrainerCertificatesAdmin />
          <FlaggedPersonsAdmin />
          <OverdueScanAdmin />
        </div>
      </div>
    </div>
  )
}