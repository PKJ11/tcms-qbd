import { getSession } from '@/lib/auth'
import { redirect }   from 'next/navigation'
import { prisma }     from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import type { UserRole } from '@/lib/types'

// ── Stat card component ───────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: number | string
  sub?:  string
  color: string
}) {
  return (
    <div
      className="bg-white rounded-xl border p-5"
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
}

// ── Quick link component ──────────────────────────────────────────

function QuickLink({
  href,
  label,
  description,
}: {
  href:        string
  label:       string
  description: string
}) {
  return (
    <a
      href={href}
      className="flex items-start gap-3 p-4 rounded-xl border bg-white hover:shadow-sm transition-shadow"
      style={{ borderColor: '#e5e7eb' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex-shrink-0 mt-0.5"
        style={{ background: '#f0fdf4' }}
      />
      <div>
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{description}</div>
      </div>
      <svg
        className="ml-auto flex-shrink-0 mt-1"
        width="14" height="14"
        viewBox="0 0 24 24" fill="none"
        stroke="#9ca3af" strokeWidth="2"
      >
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </a>
  )
}

// ── Dashboard stats per role ──────────────────────────────────────

async function getStats(userId: string, role: UserRole, unitId: string) {
  if (role === 'USER' || role === 'MANAGER') {
    const [
      myAssignments,
      myOverdue,
      myCompleted,
    ] = await Promise.all([
      prisma.trainingAssignment.count({
        where: { personId: userId, status: { not: 'COMPLETED' } },
      }),
      prisma.trainingAssignment.count({
        where: { personId: userId, status: 'OVERDUE' },
      }),
      prisma.trainingAssignment.count({
        where: { personId: userId, status: 'COMPLETED' },
      }),
    ])

    return [
      { label: 'Pending assignments', value: myAssignments, color: '#c2410c'  },
      { label: 'Overdue',             value: myOverdue,     color: '#dc2626'  },
      { label: 'Completed',           value: myCompleted,   color: '#166534'  },
    ]
  }

  if (role === 'TRAINING_HEAD' || role === 'SUPER_ADMIN') {
    const [
      totalPersons,
      totalTopics,
      totalMaterials,
      pendingApprovals,
      overdueAssignments,
      totalAssignments,
    ] = await Promise.all([
      prisma.person.count({ where: { isActive: true } }),
      prisma.trainingTopic.count({ where: { isActive: true } }),
      prisma.trainingMaterial.count({ where: { status: 'APPROVED' } }),
      prisma.materialVersion.count({ where: { status: 'DRAFT' } }),
      prisma.trainingAssignment.count({ where: { status: 'OVERDUE' } }),
      prisma.trainingAssignment.count(),
    ])

    return [
      { label: 'Active personnel',    value: totalPersons,       color: '#1d4ed8' },
      { label: 'Training topics',     value: totalTopics,        color: '#6d28d9' },
      { label: 'Approved materials',  value: totalMaterials,     color: '#166534' },
      { label: 'Pending approvals',   value: pendingApprovals,   color: '#854d0e' },
      { label: 'Overdue assignments', value: overdueAssignments, color: '#dc2626' },
      { label: 'Total assignments',   value: totalAssignments,   color: '#374151' },
    ]
  }

  if (role === 'MD') {
    const [
      totalPersons,
      totalUnits,
      overdueAssignments,
      approvedMaterials,
    ] = await Promise.all([
      prisma.person.count({ where: { isActive: true } }),
      prisma.unit.count({ where: { isActive: true } }),
      prisma.trainingAssignment.count({ where: { status: 'OVERDUE' } }),
      prisma.trainingMaterial.count({ where: { status: 'APPROVED' } }),
    ])

    return [
      { label: 'Active personnel',    value: totalPersons,       color: '#1d4ed8' },
      { label: 'Active units',        value: totalUnits,         color: '#6d28d9' },
      { label: 'Overdue assignments', value: overdueAssignments, color: '#dc2626' },
      { label: 'Approved materials',  value: approvedMaterials,  color: '#166534' },
    ]
  }

  return []
}

// ── Quick links per role ──────────────────────────────────────────

function getQuickLinks(role: UserRole) {
  const all = [
    {
      href:        '/assignments',
      label:       'My assignments',
      description: 'View and complete your training assignments',
      roles:       [] as UserRole[],
    },
    {
      href:        '/assessments',
      label:       'My assessments',
      description: 'Take pending assessments',
      roles:       [] as UserRole[],
    },
    {
      href:        '/personnel/new',
      label:       'Add person',
      description: 'Create a new staff account',
      roles:       ['TRAINING_HEAD', 'SUPER_ADMIN'] as UserRole[],
    },
    {
      href:        '/topics/new',
      label:       'Create topic',
      description: 'Add a new training topic',
      roles:       ['TRAINING_HEAD', 'SUPER_ADMIN'] as UserRole[],
    },
    {
      href:        '/content/upload',
      label:       'Upload material',
      description: 'Upload a training document or video',
      roles:       ['TRAINING_HEAD', 'SUPER_ADMIN'] as UserRole[],
    },
    {
      href:        '/audit-trail',
      label:       'Audit trail',
      description: 'View all system activity logs',
      roles:       ['TRAINING_HEAD', 'SUPER_ADMIN', 'MD'] as UserRole[],
    },
  ]

  return all.filter(
    (link) => link.roles.length === 0 || link.roles.includes(role)
  )
}

// ── Recent audit logs ─────────────────────────────────────────────

async function getRecentActivity(userId: string, role: UserRole) {
  const isAdmin = ['TRAINING_HEAD', 'SUPER_ADMIN', 'MD'].includes(role)

  return prisma.auditLog.findMany({
    where:   isAdmin ? {} : { userId },
    orderBy: { createdAt: 'desc' },
    take:    5,
    include: {
      user: { select: { name: true } },
    },
  })
}

// ── Page ──────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const { user }  = session
  const isAdmin   = ['TRAINING_HEAD', 'SUPER_ADMIN', 'MD'].includes(user.role)

  const [stats, activity] = await Promise.all([
    getStats(user.id, user.role, user.unitId),
    getRecentActivity(user.id, user.role),
  ])

  const quickLinks = getQuickLinks(user.role)

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.name.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {user.unitName}
          {user.department ? ` · ${user.department}` : ''}
          {' · '}
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            day:     'numeric',
            month:   'long',
            year:    'numeric',
          })}
        </p>
      </div>

      {/* Stats grid */}
      {stats.length > 0 && (
        <div
          className="grid gap-4 mb-8"
          style={{
            gridTemplateColumns: `repeat(${Math.min(stats.length, 3)}, 1fr)`,
          }}
        >
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              color={stat.color}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Quick links */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Quick actions
          </h2>
          <div className="flex flex-col gap-2">
            {quickLinks.map((link) => (
              <QuickLink
                key={link.href}
                href={link.href}
                label={link.label}
                description={link.description}
              />
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Recent activity
            {!isAdmin && (
              <span className="text-gray-400 font-normal ml-1">(your actions)</span>
            )}
          </h2>

          <div
            className="bg-white rounded-xl border overflow-hidden"
            style={{ borderColor: '#e5e7eb' }}
          >
            {activity.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">
                No activity yet
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['When', 'Who', 'Action', 'Module'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activity.map((log) => (
                    <tr
                      key={log.id}
                      style={{ borderBottom: '1px solid #f3f4f6' }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {log.user.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            background: '#f0fdf4',
                            color:      '#166534',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {log.module}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activity.length > 0 && (
              <div
                className="px-4 py-3 text-center"
                style={{ borderTop: '1px solid #f3f4f6' }}
              >
                <a
                  href="/audit-trail"
                  className="text-xs font-medium"
                  style={{ color: '#2d6a4f' }}
                >
                  View full audit trail →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}