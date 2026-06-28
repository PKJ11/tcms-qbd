import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen" style={{ background: '#f4f6f8' }}>
      {/* Minimal top nav — full nav comes in dashboard chunk */}
      <nav
        className="h-14 flex items-center justify-between px-6 border-b"
        style={{
          background:   '#fff',
          borderColor:  '#e5e7eb',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: '#2d6a4f', color: '#fff' }}
          >
            QbD
          </div>
          <span className="text-sm font-semibold text-gray-800">
            TCMS
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {session.user.name} &nbsp;·&nbsp;
          <span style={{ color: '#2d6a4f' }}>
            {session.user.role.replace('_', ' ')}
          </span>
        </div>
      </nav>

      {/* Page content */}
      <main>{children}</main>
    </div>
  )
}