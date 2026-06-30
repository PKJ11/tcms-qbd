import { getSession } from '@/lib/auth'
import { redirect }   from 'next/navigation'
import { prisma }     from '@/lib/prisma'
import { getQuestionBankByTopic } from '@/modules/assessment'
import { QuestionBankDetail } from '@/components/assessments/QuestionBankDetail'

export default async function BankDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const allowed = ['TRAINER', 'TRAINING_HEAD', 'SUPER_ADMIN']
  if (!allowed.includes(session.user.role)) redirect('/unauthorised')

  const bankRef = await prisma.questionBank.findUnique({
    where:  { id: params.id },
    select: { topicId: true },
  })
  if (!bankRef) redirect('/assessments')

  if (!bank) redirect('/assessments')

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-3xl mx-auto">
        <a href="/assessments" className="text-sm flex items-center gap-1 mb-4" style={{ color: '#2d6a4f' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to assessments
        </a>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{bank.topic.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {bank.passingPercentage}% pass mark · {bank.questionsPerAttempt} questions per attempt · {bank.maxAttempts} max attempts
          </p>
        </div>

        <QuestionBankDetail bank={bank} />
      </div>
    </div>
  )
}