import { getSession }  from '@/lib/auth'
import { redirect }    from 'next/navigation'
import { prisma }      from '@/lib/prisma'
import { formatDate }  from '@/lib/utils'
import {
  getTrainingHeadStats,
  getReviewerStats,
} from '@/modules/reports'
import { hasAnyRole } from '@/lib/permissions'

// ── Stat card ─────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color, href,
}: {
  label: string; value: number | string
  sub?:  string; color: string; href?: string
}) {
  const content = (
    <div
      className="bg-white rounded-xl border p-5 transition-shadow hover:shadow-sm"
      style={{ borderColor: '#e5e7eb' }}
    >
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </div>
      <div className="text-3xl font-bold" style={{ color }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs text-gray-400 mt-1">{sub}</div>
      )}
    </div>
  )

  if (href) {
    return <a href={href}>{content}</a>
  }
  return content
}

// ── Quick action link ─────────────────────────────────────────────

function QuickLink({
  href, label, description, icon,
}: {
  href: string; label: string; description: string; icon: string
}) {
  return (
    <a
      href={href}
      className="flex items-start gap-3 p-4 rounded-xl border bg-white hover:shadow-sm transition-shadow"
      style={{ borderColor: '#e5e7eb' }}
    >
      <div className="text-xl flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{description}</div>
      </div>
      <svg className="flex-shrink-0 mt-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </a>
  )
}

// ── Dashboard content per role ────────────────────────────────────

async function TrainingHeadDashboard({ userId }: { userId: string }) {
  const stats = await getTrainingHeadStats()

  const recentActivity = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take:    8,
    include: { user: { select: { name: true } } },
  })

  const upcomingDue = await prisma.trainingAssignment.findMany({
    where: {
      status:  { in: ['NOT_STARTED', 'IN_PROGRESS'] },
      dueDate: {
        gte: new Date(),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    select: {
      id:      true,
      dueDate: true,
      person:  { select: { name: true } },
      topic:   { select: { name: true } },
    },
    orderBy: { dueDate: 'asc' },
    take:    5,
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Active personnel"    value={stats.totalPersons}       color="#1d4ed8" href="/personnel"       />
        <StatCard label="Overdue trainings"   value={stats.overdueAssignments} color="#dc2626" href="/reports"         />
        <StatCard label="Pending approvals"   value={stats.pendingApprovals}   color="#854d0e" href="/content"         />
        <StatCard label="Expiring quals"      value={stats.expiringQuals}      color="#c2410c" href="/qualifications"  />
        <StatCard label="Completed (month)"   value={stats.completedThisMonth} color="#166534"                        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick actions</h2>
          <div className="flex flex-col gap-2">
            <QuickLink href="/assignments/new"       label="Assign training"      description="Assign to a person or department"           icon="📋" />
            <QuickLink href="/content/upload"        label="Upload material"       description="Add a new training document or video"       icon="📁" />
            <QuickLink href="/qualifications/new"    label="New qualification"     description="Start an analyst qualification record"      icon="🏆" />
            <QuickLink href="/refresher/new"         label="Trigger refresher"     description="Planned or deviation-triggered refresher"  icon="🔄" />
            <QuickLink href="/reports"               label="View reports"          description="Training matrix, overdue, qualification"   icon="📊" />
          </div>
        </div>

        {/* Upcoming due this week */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Due this week ({upcomingDue.length})
          </h2>
          <div
            className="bg-white rounded-xl border overflow-hidden"
            style={{ borderColor: '#e5e7eb' }}
          >
            {upcomingDue.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                Nothing due this week ✓
              </div>
            ) : (
              upcomingDue.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                >
                  <div>
                    <div className="text-xs font-medium text-gray-900">{a.person.name}</div>
                    <div className="text-xs text-gray-400">{a.topic.name}</div>
                  </div>
                  <div className="text-xs text-gray-400">{formatDate(a.dueDate)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent activity</h2>
          <div
            className="bg-white rounded-xl border overflow-hidden"
            style={{ borderColor: '#e5e7eb' }}
          >
            {recentActivity.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderBottom: '1px solid #f3f4f6' }}
              >
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                  style={{ background: '#f0fdf4', color: '#166534' }}
                >
                  {log.action}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-600 truncate">
                    {log.user.name} · {log.module}
                  </div>
                  <div className="text-xs text-gray-300">
                    {formatDate(log.createdAt)}
                  </div>
                </div>
              </div>
            ))}
            <div className="px-4 py-2.5 text-center">
              <a href="/audit-trail" className="text-xs font-medium" style={{ color: '#2d6a4f' }}>
                View full audit trail →
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// Everyone can be assigned training and attend it, regardless of role —
// so this section always renders, on top of any role-specific dashboard below.
async function MyTrainingSection({ userId }: { userId: string }) {
  const assignments = await prisma.trainingAssignment.findMany({
    where:   { personId: userId, status: { not: 'COMPLETED' } },
    select:  { id: true, status: true, dueDate: true, topic: { select: { name: true } } },
    orderBy: { dueDate: 'asc' },
    take:    5,
  })

  const overdue   = assignments.filter((a) => a.status === 'OVERDUE').length
  const pending   = assignments.filter((a) => a.status !== 'OVERDUE').length
  const completed = await prisma.trainingAssignment.count({
    where: { personId: userId, status: 'COMPLETED' },
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="max-w-3xl">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Your training</h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Pending"   value={pending}   color="#854d0e" href="/assignments" />
          <StatCard label="Overdue"   value={overdue}   color="#dc2626" href="/assignments" />
          <StatCard label="Completed" value={completed} color="#166534"                    />
        </div>

        {assignments.length === 0 ? (
          <div
            className="bg-white rounded-xl border p-6 text-center text-sm text-gray-400"
            style={{ borderColor: '#e5e7eb' }}
          >
            ✅ You have no pending training right now
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {assignments.map((a) => (
              <a
                key={a.id}
                href={`/assignments?openId=${a.id}`}
                className="bg-white rounded-xl border p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
                style={{ borderColor: a.status === 'OVERDUE' ? '#fecaca' : '#e5e7eb' }}
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {a.topic.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Due {formatDate(a.dueDate)}
                  </div>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={
                    a.status === 'OVERDUE'     ? { background: '#fef2f2', color: '#dc2626' } :
                    a.status === 'IN_PROGRESS' ? { background: '#eff6ff', color: '#1d4ed8' } :
                                                 { background: '#f9fafb', color: '#6b7280'  }
                  }
                >
                  {a.status.replace('_', ' ')}
                </span>
              </a>
            ))}
            <a
              href="/assignments"
              className="text-xs text-center font-medium py-2"
              style={{ color: '#2d6a4f' }}
            >
              View all assignments →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

async function ReviewerDashboard() {
  const stats = await getReviewerStats()

  const departments = await prisma.department.findMany({
    where:   { isActive: true },
    select:  {
      id:   true,
      name: true,
      _count: {
        select: { persons: true },
      },
    },
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total personnel"    value={stats.totalPersons}       color="#1d4ed8" />
        <StatCard label="Active departments" value={stats.totalDepartments}   color="#6d28d9" />
        <StatCard label="Active topics"      value={stats.activeTopics}       color="#2d6a4f" />
        <StatCard label="Active quals"       value={stats.approvedQuals}      color="#166534" />
        <StatCard label="Overdue trainings"  value={stats.overdueAssignments} color="#dc2626" />
        <StatCard label="Completed (year)"   value={stats.completedThisYear}  color="#854d0e" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {departments.map((department) => (
          <div
            key={department.id}
            className="bg-white rounded-xl border p-5"
            style={{ borderColor: '#e5e7eb' }}
          >
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{department.name}</h3>
            <div className="text-2xl font-bold" style={{ color: '#2d6a4f' }}>
              {department._count.persons}
            </div>
            <div className="text-xs text-gray-400">Active personnel</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const { user } = session

  return (
    <div className="min-h-screen" style={{ background: '#f4f6f8' }}>

      {/* Welcome bar */}
      <div
        className="px-6 py-4 border-b bg-white"
        style={{ borderColor: '#e5e7eb' }}
      >
        <h1 className="text-xl font-bold text-gray-900">
          Welcome back, {user.name.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {user.department}
          {user.section ? ` · ${user.section}` : ''}
          {' · '}
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      </div>

      {/* Everyone can attend training, regardless of role */}
      <MyTrainingSection userId={user.id} />

      {/* Additional role-specific dashboard content */}
      {hasAnyRole(user, ['TRAINER', 'GUEST_TRAINER']) && (
        <TrainingHeadDashboard userId={user.id} />
      )}
      {hasAnyRole(user, ['ADMINISTRATOR', 'VIEWER']) && (
        <ReviewerDashboard />
      )}
    </div>
  )
}