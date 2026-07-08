import { getSession }              from '@/lib/auth'
import { redirect }                from 'next/navigation'
import { getPersonsAndTechniques } from '@/modules/qualification'
import { CreateQualificationForm } from '@/components/qualifications/CreateQualificationForm'

export default async function NewQualificationPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // TRAINING_HEAD and ADMINISTRATOR can create qualifications
  const allowed = ['TRAINING_HEAD', 'ADMINISTRATOR']
  if (!allowed.includes(session.user.role)) {
    redirect('/unauthorised')
  }

  const { persons, techniques } = await getPersonsAndTechniques()

  // Debug — log what we got
  console.log('Persons count:', persons.length)
  console.log('Techniques count:', techniques.length)

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <a
            href="/qualifications"
            className="text-sm flex items-center gap-1 mb-4"
            style={{ color: '#2d6a4f' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to qualifications
          </a>
          <h1 className="text-2xl font-bold text-gray-900">
            New qualification record
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Record that an analyst has performed a technique and is being assessed
            for competency. URS-SQF-001.
          </p>
        </div>

        {techniques.length === 0 ? (
          <div
            className="bg-white rounded-2xl border p-8 text-center"
            style={{ borderColor: '#e5e7eb' }}
          >
            <svg
              className="mx-auto mb-3"
              width="40" height="40"
              viewBox="0 0 24 24" fill="none"
              stroke="#d1d5db" strokeWidth="1.5"
            >
              <circle cx="12" cy="8" r="6"/>
              <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
            </svg>
            <p className="text-sm text-gray-500 mb-3">
              No analytical techniques configured yet.
              You must add at least one technique before creating a qualification record.
            </p>
            <a
              href="/qualifications/techniques"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white inline-block"
              style={{ background: '#2d6a4f' }}
            >
              Add techniques first →
            </a>
          </div>
        ) : (
          <CreateQualificationForm persons={persons} techniques={techniques} />
        )}
      </div>
    </div>
  )
}