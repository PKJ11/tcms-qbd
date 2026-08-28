import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPersons } from '@/modules/personnel'
import { PERMISSIONS, hasAnyRole, ROLE_LABELS, ROLE_COLORS } from '@/lib/permissions'
import type { AppRole } from '@/lib/types'

const ALL_ROLES: AppRole[] = [
  'ADMINISTRATOR', 'VIEWER', 'TRAINER', 'TRAINEE', 'GUEST_TRAINER', 'CONTRACTUAL_EMPLOYEE',
]

export default async function RolesDetailsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_USERS)) redirect('/unauthorised')

  const persons = await getPersons({})

  // Count of people holding each role
  const roleCounts = ALL_ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r] = persons.filter((p) => p.roles.includes(r)).length
    return acc
  }, {})

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-7xl mx-auto">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Roles Details</h1>
          <p className="text-sm text-gray-500 mt-1">
            Every user and the roles assigned to them.
          </p>
        </div>

        {/* Role summary */}
        <div
          className="bg-white rounded-xl border p-4 mb-4 flex flex-wrap gap-2"
          style={{ borderColor: '#e5e7eb' }}
        >
          {ALL_ROLES.map((r) => (
            <span
              key={r}
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: ROLE_COLORS[r].bg, color: ROLE_COLORS[r].color }}
            >
              {ROLE_LABELS[r]} · {roleCounts[r]}
            </span>
          ))}
        </div>

        {/* Table */}
        <div
          className="bg-white rounded-xl border overflow-hidden"
          style={{ borderColor: '#e5e7eb' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['SN.', 'EMP ID', 'Full Name', 'Dept', 'Unit', 'Status', 'Roles'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {persons.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  persons.map((p, idx) => (
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid #f3f4f6' }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {p.employeeId}
                      </td>
                      <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {p.department?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {p.unit?.name ?? '—'}{p.section?.name ? ` / ${p.section.name}` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={
                            p.isActive
                              ? { background: '#f0fdf4', color: '#166534' }
                              : { background: '#fef2f2', color: '#dc2626' }
                          }
                        >
                          {p.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.roles.length === 0 ? (
                            <span className="text-xs text-gray-400">—</span>
                          ) : (
                            p.roles.map((role) => (
                              <span
                                key={role}
                                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                style={{ background: ROLE_COLORS[role].bg, color: ROLE_COLORS[role].color }}
                              >
                                {ROLE_LABELS[role]}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          {persons.length} user{persons.length !== 1 ? 's' : ''} total
        </p>
      </div>
    </div>
  )
}
