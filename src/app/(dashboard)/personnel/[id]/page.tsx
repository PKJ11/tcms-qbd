import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPersonById } from '@/modules/personnel'
import { PersonDetail } from '@/components/personnel/PersonDetail'
import { formatDate } from '@/lib/utils'

export default async function PersonDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const person = await getPersonById(params.id)
  if (!person) redirect('/personnel')

  const canEdit = ['TRAINING_HEAD', 'ADMINISTRATOR'].includes(session.user.role)

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <a
            href="/personnel"
            className="text-sm flex items-center gap-1 mb-4"
            style={{ color: '#2d6a4f' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to personnel
          </a>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ background: '#f0fdf4', color: '#2d6a4f' }}
              >
                {person.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {person.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {person.employeeId} &nbsp;·&nbsp; {person.designation}
                </p>
              </div>
            </div>

            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={
                person.isActive
                  ? { background: '#f0fdf4', color: '#166534' }
                  : { background: '#fef2f2', color: '#dc2626' }
              }
            >
              {person.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Details card */}
        <div
          className="bg-white rounded-2xl border p-6 mb-4"
          style={{ borderColor: '#e5e7eb' }}
        >
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Details
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Email',       value: person.email             },
              { label: 'Role',        value: person.role.replace('_',' ') },
              { label: 'Unit',        value: person.unit.name         },
              { label: 'Department',  value: person.department?.name ?? '—' },
              { label: 'Manager',     value: person.manager?.name    ?? '—' },
              { label: 'Joined',      value: formatDate(person.joiningDate) },
              { label: 'Last login',  value: person.lastLoginAt ? formatDate(person.lastLoginAt) : '—' },
              { label: 'Must change password', value: person.mustChangePassword ? 'Yes' : 'No' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                <div className="text-gray-800 font-medium">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {canEdit && (
          <PersonDetail person={person} />
        )}
      </div>
    </div>
  )
}