'use server'

import { prisma }        from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import {
  createQuestionBankSchema,
  createQuestionSchema,
  submitAttemptSchema,
} from './schema'
import type {
  CreateQuestionBankInput,
  CreateQuestionInput,
  SubmitAttemptInput,
  QuestionItemSafe,
  AttemptResult,
} from './types'
import { syncRefresherCompletion } from '@/modules/refresher'

// ─────────────────────────────────────────────────────────────────
// QUESTION BANK MANAGEMENT
// ─────────────────────────────────────────────────────────────────

export async function getQuestionBankByTopic(topicId: string) {
  return prisma.questionBank.findUnique({
    where:  { topicId },
    select: {
      id:                  true,
      topicId:             true,
      passingPercentage:   true,
      questionsPerAttempt: true,
      maxAttempts:         true,
      isActive:            true,
      topic: { select: { id: true, name: true } },
      questions: {
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { questions: true } },
    },
  })
}

export async function createQuestionBank(
  input:         CreateQuestionBankInput,
  justification: string,
  actorId:       string
) {
  const parsed = createQuestionBankSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.message)

  const existing = await prisma.questionBank.findUnique({
    where: { topicId: input.topicId },
  })
  if (existing) throw new Error('A question bank already exists for this topic')

  const topic = await prisma.trainingTopic.findUnique({
    where:  { id: input.topicId },
    select: { id: true, name: true },
  })
  if (!topic) throw new Error('Topic not found')

  const bank = await prisma.questionBank.create({
    data: {
      topicId:             input.topicId,
      passingPercentage:   input.passingPercentage,
      questionsPerAttempt: input.questionsPerAttempt,
      maxAttempts:         input.maxAttempts,
    },
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'CREATE',
    module:        'ASSESSMENT',
    recordId:      bank.id,
    recordType:    'QuestionBank',
    beforeValue:   null,
    afterValue:    {
      topicName:           topic.name,
      passingPercentage:   input.passingPercentage,
      questionsPerAttempt: input.questionsPerAttempt,
      maxAttempts:         input.maxAttempts,
    },
    justification,
  })

  return bank
}

export async function updateQuestionBank(
  bankId:        string,
  input:         Partial<CreateQuestionBankInput>,
  justification: string,
  actorId:       string
) {
  const before = await prisma.questionBank.findUnique({
    where:  { id: bankId },
    select: { passingPercentage: true, questionsPerAttempt: true, maxAttempts: true },
  })
  if (!before) throw new Error('Question bank not found')

  const after = await prisma.questionBank.update({
    where: { id: bankId },
    data:  {
      ...(input.passingPercentage   !== undefined && { passingPercentage:   input.passingPercentage   }),
      ...(input.questionsPerAttempt !== undefined && { questionsPerAttempt: input.questionsPerAttempt }),
      ...(input.maxAttempts         !== undefined && { maxAttempts:         input.maxAttempts          }),
    },
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'UPDATE',
    module:        'ASSESSMENT',
    recordId:      bankId,
    recordType:    'QuestionBank',
    beforeValue:   before,
    afterValue:    {
      passingPercentage:   after.passingPercentage,
      questionsPerAttempt: after.questionsPerAttempt,
      maxAttempts:         after.maxAttempts,
    },
    justification,
  })

  return after
}

// ─────────────────────────────────────────────────────────────────
// QUESTION MANAGEMENT
// ─────────────────────────────────────────────────────────────────

export async function createQuestion(
  input:         CreateQuestionInput,
  justification: string,
  actorId:       string
) {
  const parsed = createQuestionSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.message)

  const bank = await prisma.questionBank.findUnique({
    where:  { id: input.bankId },
    select: { id: true, topic: { select: { name: true } } },
  })
  if (!bank) throw new Error('Question bank not found')

  const question = await prisma.question.create({
    data: {
      bankId:        input.bankId,
      questionText:  input.questionText,
      optionA:       input.optionA,
      optionB:       input.optionB,
      optionC:       input.optionC,
      optionD:       input.optionD,
      correctAnswer: input.correctAnswer,
    },
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'CREATE',
    module:        'ASSESSMENT',
    recordId:      question.id,
    recordType:    'Question',
    beforeValue:   null,
    afterValue:    {
      topicName:    bank.topic.name,
      questionText: input.questionText,
    },
    justification,
  })

  return question
}

export async function updateQuestion(
  questionId:    string,
  input:         Partial<Omit<CreateQuestionInput, 'bankId'>>,
  justification: string,
  actorId:       string
) {
  const before = await prisma.question.findUnique({ where: { id: questionId } })
  if (!before) throw new Error('Question not found')

  const after = await prisma.question.update({
    where: { id: questionId },
    data:  {
      ...(input.questionText  !== undefined && { questionText:  input.questionText  }),
      ...(input.optionA       !== undefined && { optionA:       input.optionA       }),
      ...(input.optionB       !== undefined && { optionB:       input.optionB       }),
      ...(input.optionC       !== undefined && { optionC:       input.optionC       }),
      ...(input.optionD       !== undefined && { optionD:       input.optionD       }),
      ...(input.correctAnswer !== undefined && { correctAnswer: input.correctAnswer }),
    },
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'UPDATE',
    module:        'ASSESSMENT',
    recordId:      questionId,
    recordType:    'Question',
    beforeValue:   { questionText: before.questionText, correctAnswer: before.correctAnswer },
    afterValue:    { questionText: after.questionText,  correctAnswer: after.correctAnswer  },
    justification,
  })

  return after
}

export async function deactivateQuestion(
  questionId:    string,
  justification: string,
  actorId:       string
) {
  const question = await prisma.question.findUnique({ where: { id: questionId } })
  if (!question) throw new Error('Question not found')

  await prisma.question.update({
    where: { id: questionId },
    data:  { isActive: false },
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'DELETE',
    module:        'ASSESSMENT',
    recordId:      questionId,
    recordType:    'Question',
    beforeValue:   { isActive: true  },
    afterValue:    { isActive: false },
    justification,
  })
}

// ─────────────────────────────────────────────────────────────────
// ASSESSMENT ATTEMPT FLOW
// ─────────────────────────────────────────────────────────────────

// ── Start an attempt — returns randomised questions WITHOUT answers ──

export async function getAttemptQuestions(
  bankId:       string,
  assignmentId: string,
  personId:     string
): Promise<{
  bank: { id: string; passingPercentage: number; questionsPerAttempt: number; maxAttempts: number }
  questions: QuestionItemSafe[]
  attemptNo: number
  attemptsRemaining: number
}> {
  const bank = await prisma.questionBank.findUnique({
    where:  { id: bankId },
    select: {
      id: true, passingPercentage: true, questionsPerAttempt: true,
      maxAttempts: true, isActive: true,
      questions: { where: { isActive: true } },
    },
  })

  if (!bank)            throw new Error('Question bank not found')
  if (!bank.isActive)   throw new Error('This assessment is currently inactive')
  if (bank.questions.length === 0) throw new Error('No questions available in this bank')

  // Verify assignment belongs to this person and is in valid state
  const assignment = await prisma.trainingAssignment.findUnique({
    where:  { id: assignmentId },
    select: { id: true, personId: true, status: true },
  })
  if (!assignment)                    throw new Error('Assignment not found')
  if (assignment.personId !== personId) throw new Error('Not authorised')
  if (assignment.status === 'COMPLETED') throw new Error('This training is already completed')

  // Check attempt count
  const previousAttempts = await prisma.assessmentAttempt.count({
    where: { personId, bankId, assignmentId },
  })

  if (previousAttempts >= bank.maxAttempts) {
    throw new Error('Maximum attempts exceeded. Please contact your Training Coordinator.')
  }

  // Randomly select N questions from the active pool
  const shuffled = [...bank.questions].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, Math.min(bank.questionsPerAttempt, shuffled.length))

  // Strip correct answers before sending to client
  const safeQuestions: QuestionItemSafe[] = selected.map((q) => ({
    id:           q.id,
    questionText: q.questionText,
    optionA:      q.optionA,
    optionB:      q.optionB,
    optionC:      q.optionC,
    optionD:      q.optionD,
  }))

  return {
    bank: {
      id:                  bank.id,
      passingPercentage:   bank.passingPercentage,
      questionsPerAttempt: bank.questionsPerAttempt,
      maxAttempts:         bank.maxAttempts,
    },
    questions:         safeQuestions,
    attemptNo:         previousAttempts + 1,
    attemptsRemaining: bank.maxAttempts - previousAttempts - 1,
  }
}

// ── Submit attempt — grades server-side, never trusts client score ──

export async function submitAttempt(
  input:   SubmitAttemptInput,
  actorId: string
): Promise<AttemptResult> {
  const parsed = submitAttemptSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.message)

  const assignment = await prisma.trainingAssignment.findUnique({
  where:  { id: input.assignmentId },
  select: { id: true, personId: true, topicId: true, status: true, trigger: true },
})
  if (!assignment)                       throw new Error('Assignment not found')
  if (assignment.personId !== actorId)   throw new Error('Not authorised')

  const bank = await prisma.questionBank.findUnique({
    where:  { id: input.bankId },
    select: { id: true, passingPercentage: true, maxAttempts: true },
  })
  if (!bank) throw new Error('Question bank not found')

  // Re-check attempt limit server-side (never trust the client)
  const previousAttempts = await prisma.assessmentAttempt.count({
    where: { personId: actorId, bankId: input.bankId, assignmentId: input.assignmentId },
  })
  if (previousAttempts >= bank.maxAttempts) {
    throw new Error('Maximum attempts exceeded')
  }

  // Fetch correct answers for ONLY the questions that were actually answered
  const questionIds = Object.keys(input.answers)
  const questions    = await prisma.question.findMany({
    where:  { id: { in: questionIds } },
    select: { id: true, correctAnswer: true },
  })

  // Grade — pure server-side calculation
  let correctCount = 0
  for (const q of questions) {
    if (input.answers[q.id] === q.correctAnswer) correctCount++
  }
  const totalCount = questions.length
  const score      = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
  const attemptNo  = previousAttempts + 1
  const passed     = score >= bank.passingPercentage

  // Determine outcome
  let outcome: 'PASS' | 'FAIL' | 'NEEDS_RETRAINING'
  if (passed) {
    outcome = 'PASS'
  } else if (attemptNo >= bank.maxAttempts) {
    outcome = 'NEEDS_RETRAINING'
  } else {
    outcome = 'FAIL'
  }

  // Save attempt + update assignment in a transaction
  await prisma.$transaction(async (tx) => {
    await tx.assessmentAttempt.create({
      data: {
        personId:     actorId,
        bankId:       input.bankId,
        assignmentId: input.assignmentId,
        attemptNo,
        score,
        outcome,
        answers:      input.answers,
        startedAt:    new Date(input.startedAt),
        submittedAt:  new Date(),
      },
    })

    if (outcome === 'PASS') {
      await tx.trainingAssignment.update({
        where: { id: input.assignmentId },
        data:  { status: 'COMPLETED', completedAt: new Date() },
      })
      // Sync linked refresher trigger if this was a refresher-driven assessment
  if (assignment.trigger === 'REFRESHER') {
    // Note: syncRefresherCompletion uses its own prisma client call,
    // safe to call after the transaction since it's a simple lookup+update
  }
    } else if (outcome === 'NEEDS_RETRAINING') {
      // Mark current assignment as FAILED
      await tx.trainingAssignment.update({
        where: { id: input.assignmentId },
        data:  { status: 'FAILED' },
      })

      // Auto-create a new RETRAINING assignment
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 14)

      await tx.trainingAssignment.create({
        data: {
          personId:     actorId,
          topicId:      assignment.topicId,
          trigger:      'RETRAINING',
          status:       'NOT_STARTED',
          assignedById: actorId, // system-triggered, attributed to self for traceability
          dueDate,
        },
      })

      await tx.notification.create({
        data: {
          personId: actorId,
          type:     'RETRAINING',
          channel:  'IN_APP',
          title:    'Retraining required',
          message:  `You did not pass the assessment after ${bank.maxAttempts} attempts. A new retraining assignment has been created.`,
        },
      })

      // Check total retraining cycles for this person+topic
      // If 3 or more complete retraining cycles — flag for job reassignment
      const totalRetrain = await tx.trainingAssignment.count({
        where: {
          personId: actorId,
          topicId:  assignment.topicId,
          trigger:  'RETRAINING',
          status:   { in: ['FAILED', 'COMPLETED'] },
        },
      })

      if (totalRetrain >= 3) {
        await tx.person.update({
          where: { id: actorId },
          data:  {
            flaggedForJobReassignment: true,
            flaggedAt:                  new Date(),
            flagReason:                 `Failed to achieve competency on topic after ${totalRetrain} retraining cycles. Job reassignment review required per SOP QbD-QA-SOP-007.`,
          },
        })

        // Notify Training Head
        const trainingHeads = await tx.person.findMany({
          where:  { role: 'TRAINING_HEAD', isActive: true },
          select: { id: true },
        })

        if (trainingHeads.length > 0) {
          await tx.notification.createMany({
            data: trainingHeads.map((th) => ({
              personId: th.id,
              type:     'RETRAINING' as const,
              channel:  'IN_APP'     as const,
              title:    'Job reassignment review required',
              message:  `An analyst has failed ${totalRetrain} retraining cycles and requires a job reassignment review per SOP QbD-QA-SOP-007.`,
            })),
          })
        }
      }
    } else {
      // FAIL but attempts remain — keep assignment IN_PROGRESS
      await tx.trainingAssignment.update({
        where: { id: input.assignmentId },
        data:  { status: 'IN_PROGRESS' },
      })
    }
  })

  // Audit log
  await logAuditEvent({
    userId:        actorId,
    action:        'CREATE',
    module:        'ASSESSMENT',
    recordId:      input.assignmentId,
    recordType:    'AssessmentAttempt',
    beforeValue:   null,
    afterValue:    { attemptNo, score, outcome, correctCount, totalCount },
    justification: `Assessment attempt ${attemptNo} submitted — scored ${score}%, outcome: ${outcome}`,
  })

  return {
    attemptId:    'pending',
    score,
    outcome,
    attemptNo,
    maxAttempts:  bank.maxAttempts,
    correctCount,
    totalCount,
  }
}

// ── Get attempt history for a person+topic (for admin/manager view) ──

export async function getAttemptHistory(filters?: {
  personId?: string
  bankId?:   string
}) {
  return prisma.assessmentAttempt.findMany({
    where: {
      ...(filters?.personId && { personId: filters.personId }),
      ...(filters?.bankId   && { bankId:   filters.bankId   }),
    },
    select: {
      id:          true,
      attemptNo:   true,
      score:       true,
      outcome:     true,
      startedAt:   true,
      submittedAt: true,
      person: { select: { id: true, name: true, employeeId: true } },
      bank:   { select: { id: true, topic: { select: { name: true } } } },
    },
    orderBy: { submittedAt: 'desc' },
  })
}

// ── Get topics without question banks (for setup dropdown) ───────

export async function getTopicsWithoutBank() {
  return prisma.trainingTopic.findMany({
    where: {
      isActive: true,
      questionBank: null,
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

// ── Get all question banks (admin list) ───────────────────────────

export async function getAllQuestionBanks() {
  return prisma.questionBank.findMany({
    select: {
      id:                  true,
      passingPercentage:   true,
      questionsPerAttempt: true,
      maxAttempts:         true,
      isActive:            true,
      topic: { select: { id: true, name: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { topic: { name: 'asc' } },
  })
}

// ── Oral assessment — trainer manually records outcome ─────────────

export async function submitOralAttempt(
  input: {
    assignmentId: string
    bankId:       string
    outcome:      'PASS' | 'FAIL'
    notes?:       string
  },
  actorId: string
): Promise<AttemptResult> {
  // Verify actor is a Trainer/Training Head/Super Admin
  const actor = await prisma.person.findUnique({
    where:  { id: actorId },
    select: { role: true, name: true },
  })
  const allowedRoles = ['TRAINER', 'TRAINING_HEAD', 'SUPER_ADMIN']
  if (!actor || !allowedRoles.includes(actor.role)) {
    throw new Error('Only Trainers can record oral assessment outcomes')
  }

  const assignment = await prisma.trainingAssignment.findUnique({
    where:  { id: input.assignmentId },
    select: { id: true, personId: true, topicId: true, status: true, trigger: true },
  })
  if (!assignment) throw new Error('Assignment not found')

  const bank = await prisma.questionBank.findUnique({
    where:  { id: input.bankId },
    select: { id: true, maxAttempts: true, passingPercentage: true },
  })
  if (!bank) throw new Error('Assessment bank not found')

  const previousAttempts = await prisma.assessmentAttempt.count({
    where: { personId: assignment.personId, bankId: input.bankId, assignmentId: input.assignmentId },
  })

  if (previousAttempts >= bank.maxAttempts) {
    throw new Error('Maximum attempts exceeded')
  }

  const attemptNo = previousAttempts + 1
  const passed    = input.outcome === 'PASS'
  const score     = passed ? 100 : 0

  let outcome: 'PASS' | 'FAIL' | 'NEEDS_RETRAINING'
  if (passed) {
    outcome = 'PASS'
  } else if (attemptNo >= bank.maxAttempts) {
    outcome = 'NEEDS_RETRAINING'
  } else {
    outcome = 'FAIL'
  }

  await prisma.$transaction(async (tx) => {
    await tx.assessmentAttempt.create({
      data: {
        personId:     assignment.personId,
        bankId:       input.bankId,
        assignmentId: input.assignmentId,
        attemptNo,
        score,
        outcome,
        answers:      { oral: true, recordedBy: actorId, notes: input.notes ?? '' },
        startedAt:    new Date(),
        submittedAt:  new Date(),
      },
    })

    if (outcome === 'PASS') {
      await tx.trainingAssignment.update({
        where: { id: input.assignmentId },
        data:  { status: 'COMPLETED', completedAt: new Date() },
      })
    } else if (outcome === 'NEEDS_RETRAINING') {
      await tx.trainingAssignment.update({
        where: { id: input.assignmentId },
        data:  { status: 'FAILED' },
      })

      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 14)

      await tx.trainingAssignment.create({
        data: {
          personId:     assignment.personId,
          topicId:      assignment.topicId,
          trigger:      'RETRAINING',
          status:       'NOT_STARTED',
          assignedById: actorId,
          dueDate,
        },
      })

      await tx.notification.create({
        data: {
          personId: assignment.personId,
          type:     'RETRAINING',
          channel:  'IN_APP',
          title:    'Retraining required',
          message:  `You did not pass the oral assessment after ${bank.maxAttempts} attempts. A retraining assignment has been created.`,
        },
      })
    }
  })

  if (outcome === 'PASS' && assignment.trigger === 'REFRESHER') {
    const { syncRefresherCompletion } = await import('@/modules/refresher')
    await syncRefresherCompletion(assignment.personId, assignment.topicId)
  }

  await logAuditEvent({
    userId:        actorId,
    action:        'CREATE',
    module:        'ASSESSMENT',
    recordId:      input.assignmentId,
    recordType:    'AssessmentAttempt',
    beforeValue:   null,
    afterValue:    { attemptNo, outcome, recordedBy: actor.name, type: 'ORAL' },
    justification: `Oral assessment attempt ${attemptNo} recorded by trainer — outcome: ${outcome}`,
  })

  return {
    attemptId:    'oral',
    score,
    outcome,
    attemptNo,
    maxAttempts:  bank.maxAttempts,
    correctCount: passed ? 1 : 0,
    totalCount:   1,
  }
}