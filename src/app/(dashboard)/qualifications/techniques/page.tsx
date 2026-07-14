import { getSession }    from '@/lib/auth'
import { redirect }      from 'next/navigation'
import { getAllTechniques } from '@/modules/qualification'
import { TechniquesManager } from '@/components/qualifications/TechniquesManager'
import { canManageQualifications } from '@/lib/permissions'

export default async function TechniquesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  if (!canManageQualifications(session.user)) redirect('/unauthorised')

  const techniques = await getAllTechniques()
  const canCreate  = canManageQualifications(session.user)

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <a href="/qualifications" className="text-sm flex items-center gap-1 mb-4" style={{ color: '#2d6a4f' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to qualifications
          </a>
          <h1 className="text-2xl font-bold text-gray-900">Analytical Techniques</h1>
          <p className="text-sm text-gray-500 mt-1">
            Master list of techniques analysts can be qualified on. URS-SQF-005.
          </p>
        </div>

        <TechniquesManager techniques={techniques} canCreate={canCreate} />
      </div>
    </div>
  )
}