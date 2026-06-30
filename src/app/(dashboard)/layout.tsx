import { getSession } from '@/lib/auth'
import { redirect }   from 'next/navigation'
import { Sidebar }    from '@/components/layout/Sidebar'
import { TopBar }     from '@/components/layout/TopBar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  // Force password change
  // (middleware handles this but belt-and-suspenders)
  if (session.user.mustChangePassword) {
    redirect('/change-password')
  }

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Sidebar — fixed on left */}
      <Sidebar user={session.user} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Top bar */}
        <TopBar user={session.user} />

        {/* Scrollable page content */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ background: '#f4f6f8' }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}