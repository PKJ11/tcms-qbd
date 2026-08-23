import { getSession } from '@/lib/auth'
import { redirect }   from 'next/navigation'
import { Sidebar }    from '@/components/layout/Sidebar'
import { TopBar }     from '@/components/layout/TopBar'
import { ActiveTrainingsModal } from '@/components/notifications/ActiveTrainingsModal'
import { SessionTimeoutManager } from '@/components/layout/SessionTimeoutManager'

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

  // Warn from 15 days out (day 30 of the 45-day policy) until expiry
  const daysRemaining  = session.user.passwordDaysRemaining
  const showExpiryWarn = daysRemaining <= 15 && daysRemaining > 0

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Sidebar — fixed on left */}
      <Sidebar user={session.user as any} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Top bar */}
        <TopBar user={session.user} />

        <ActiveTrainingsModal />
        <SessionTimeoutManager />

        {showExpiryWarn && (
          <div
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium"
            style={{ background: '#fefce8', color: '#854d0e', borderBottom: '1px solid #fde68a' }}
          >
            <span>
              Your password expires in {daysRemaining} day{daysRemaining === 1 ? '' : 's'}.
            </span>
            <a href="/change-password" className="underline font-semibold">
              Change it now
            </a>
          </div>
        )}

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