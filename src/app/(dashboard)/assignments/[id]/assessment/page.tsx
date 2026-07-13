import { getSession } from '@/lib/auth'
import { redirect }   from 'next/navigation'
import { getAssignmentById } from '@/modules/assignments'
import { getQuestionBankByTopic } from '@/modules/assessment'
import { AssessmentTakingView } from '@/components/assessments/AssessmentTakingView'

export default async function AssignmentAssessmentPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const assignment = await getAssignmentById(params.id)
  if (!assignment) redirect('/assignments')

  const detailUrl = `/assignments/${params.id}`

  if (assignment.person.id !== session.user.id) redirect(detailUrl)
  if (assignment.topic.trainingType !== 'MATERIAL_MCQ') redirect(detailUrl)
  if (assignment.status === 'COMPLETED') redirect(detailUrl)

  const approvedMaterials = assignment.topic.materials.filter((m) => m.versions.length > 0)
  const confirmedIds = new Set(assignment.materialConfirmations.map((c) => c.materialId))
  const allConfirmed = approvedMaterials.length > 0 &&
    approvedMaterials.every((m) => confirmedIds.has(m.id))
  if (!allConfirmed) redirect(detailUrl)

  const bank = await getQuestionBankByTopic(assignment.topic.id)
  if (!bank || !bank.isActive) redirect(detailUrl)

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-2xl mx-auto">
        <a
          href={detailUrl}
          className="text-sm flex items-center gap-1 mb-4"
          style={{ color: '#2d6a4f' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to assignment
        </a>

        <AssessmentTakingView
          assignmentId={assignment.id}
          bankId={bank.id}
          topicName={assignment.topic.name}
          maxAttempts={bank.maxAttempts}
        />
      </div>
    </div>
  )
}
