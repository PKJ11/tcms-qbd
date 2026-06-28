import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUnitsAndDepartments } from '@/modules/personnel'
import { CreatePersonForm } from '@/components/personnel/CreatePersonForm'

export default async function NewPersonPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const allowed = ['TRAINING_HEAD', 'SUPER_ADMIN']
  if (!allowed.includes(session.user.role)) redirect('/unauthorised')

  const { units, departments } = await getUnitsAndDepartments()

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-2xl mx-auto">
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
          <h1 className="text-2xl font-bold text-gray-900">Add person</h1>
          <p className="text-sm text-gray-500 mt-1">
            A temporary password will be generated and emailed to the person.
          </p>
        </div>

        <CreatePersonForm units={units} departments={departments} />
      </div>
    </div>
  )
}