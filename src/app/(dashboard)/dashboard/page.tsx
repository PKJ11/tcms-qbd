import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div
      className="min-h-screen p-8"
      style={{ background: '#f4f6f8' }}
    >
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border p-8"
        style={{ borderColor: '#e5e7eb' }}
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Welcome, {session.user.name}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {session.user.role} &nbsp;·&nbsp; {session.user.unitName}
          {session.user.department ? ` · ${session.user.department}` : ''}
        </p>
        <div
          className="text-sm px-4 py-3 rounded-lg"
          style={{ background: '#f0fdf4', color: '#166534' }}
        >
          ✅ Authentication working. Full dashboard coming in later chunks.
        </div>
      </div>
    </div>
  )
}