import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AuditTrailViewer } from '@/components/AuditTrailViewer'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export default async function AuditTrailPage() {
  const session = await getSession()

  if (!session) redirect('/login')

  if (!hasAnyRole(session.user, PERMISSIONS.VIEW_AUDIT_TRAIL)) redirect('/unauthorised')

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: '#f4f6f8' }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Audit Trail
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tamper-evident log of all system actions — who, when, what, and why.
            Read-only. URS-CMP-002 · ALCOA+ compliant.
          </p>
        </div>

        <AuditTrailViewer />
      </div>
    </div>
  )
}