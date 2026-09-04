'use server'

import { prisma }        from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import { hasAnyRole }    from '@/lib/permissions'
import {
  createQuestionBankSchema,
  submitAttemptSchema,
} from './schema'
import type {
  CreateQuestionBankInput,
  SubmitAttemptInput,
  QuestionItemSafe,
  AttemptResult,
} from './types'
import type { Prisma } from '@prisma/client'
import { syncRefresherCompletion } from '@/modules/refresher'
import { assertTopicContentAccess } from '@/modules/topics'
import { PASSING_PERCENTAGE, QUESTIONS_PER_ATTEMPT, MAX_ATTEMPTS } from './constants'

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
      topic:               { select: { id: true, name: true } },
      currentVersionId:    true,
      currentVersion: {
        select: {
          id:           true,
          versionNo:    true,
          versionLabel: true,
          createdAt:    true,
          createdBy:    { select: { id: true, name: true } },
          questions:    { orderBy: { createdAt: 'asc' } },
        },
      },
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
  const questions = parsed.data.questions

  const topic = await prisma.trainingTopic.findUnique({
    where:  { id: input.topicId },
    select: { id: true, name: true },
  })
  if (!topic) throw new Error('Topic not found')

  await assertTopicContentAccess(input.topicId, actorId)

  const existing = await prisma.questionBank.findUnique({
    where: { topicId: input.topicId },
  })
  if (existing) throw new Error('Questions already exist for this topic')

  // A bank is never created empty — it's created together with its first
  // version (1.0) and the questions staged for it, all in one transaction.
  // The working set is seeded from that same version so editing continues
  // seamlessly afterwards, exactly as it would after any later save.
  const bank = await prisma.$transaction(async (tx) => {
    const created = await tx.questionBank.create({
      data: {
        topicId:             input.topicId,
        passingPercentage:   PASSING_PERCENTAGE,
        questionsPerAttempt: QUESTIONS_PER_ATTEMPT,
        maxAttempts:         MAX_ATTEMPTS,
      },
    })

    const version = await tx.questionBankVersion.create({
      data: {
        bankId:           created.id,
        versionNo:        1,
        versionLabel:     '1.0',
        basedOnVersionId: null,
        createdById:      actorId,
        questions: {
          create: questions.map((q) => ({
            questionText:  q.questionText,
            optionA:       q.optionA,
            optionB:       q.optionB,
            optionC:       q.optionC,
            optionD:       q.optionD,
            correctAnswer: q.correctAnswer,
            isActive:      true,
          })),
        },
      },
      include: { questions: { orderBy: { createdAt: 'asc' } } },
    })

    await tx.questionBankWorkingSet.create({
      data: {
        bankId:        created.id,
        baseVersionId: version.id,
        updatedById:   actorId,
        items: {
          create: version.questions.map((q) => ({
            sourceQuestionId: q.id,
            questionText:     q.questionText,
            optionA:          q.optionA,
            optionB:          q.optionB,
            optionC:          q.optionC,
            optionD:          q.optionD,
            correctAnswer:    q.correctAnswer,
            isActive:         q.isActive,
          })),
        },
      },
    })

    return tx.questionBank.update({
      where:   { id: created.id },
      data:    { currentVersionId: version.id },
      include: { currentVersion: true },
    })
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
      versionLabel:        bank.currentVersion?.versionLabel,
      questionCount:       input.questions.length,
      passingPercentage:   PASSING_PERCENTAGE,
      questionsPerAttempt: QUESTIONS_PER_ATTEMPT,
      maxAttempts:         MAX_ATTEMPTS,
    },
    justification,
  })

  return bank
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
    },
  })

  if (!bank)            throw new Error('Questions not found')
  if (!bank.isActive)   throw new Error('This assessment is currently inactive')

  // Verify assignment belongs to this person and is in valid state
  const assignment = await prisma.trainingAssignment.findUnique({
    where:  { id: assignmentId },
    select: {
      id: true, personId: true, status: true, topicId: true, questionBankVersionId: true,
      topic: {
        select: {
          materials: { where: { status: 'APPROVED' }, select: { id: true } },
        },
      },
    },
  })
  if (!assignment)                    throw new Error('Assignment not found')
  if (assignment.personId !== personId) throw new Error('Not authorised')
  if (assignment.status === 'COMPLETED') throw new Error('This training is already completed')
  if (!assignment.questionBankVersionId) throw new Error('No question version is pinned for this assignment')

  // Always draw from the version pinned at assignment time, never whatever
  // the bank currently looks like — that's what makes an attempt traceable.
  const version = await prisma.questionBankVersion.findUnique({
    where:  { id: assignment.questionBankVersionId },
    select: { questions: { where: { isActive: true } } },
  })
  if (!version || version.questions.length === 0) {
    throw new Error('No questions available')
  }

  if (assignment.topic.materials.length > 0) {
    const confirmedCount = await prisma.assignmentMaterialConfirmation.count({
      where: { assignmentId },
    })
    if (confirmedCount < assignment.topic.materials.length) {
      throw new Error('You must review and confirm all training material before attempting the assessment')
    }
  }

  // Check attempt count
  const previousAttempts = await prisma.assessmentAttempt.count({
    where: { personId, bankId, assignmentId },
  })

  if (previousAttempts >= bank.maxAttempts) {
    throw new Error('Maximum attempts exceeded. Please contact your Training Coordinator.')
  }

  // Randomly select N questions from the active pool of the pinned version
  const shuffled = [...version.questions].sort(() => Math.random() - 0.5)
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

// ── Exhausted all assessment attempts (written or oral) ───────────
// The system NEVER auto-creates the next training. The failed assignment
// is marked FAILED and everyone is notified — a Trainer reviews and
// assigns retraining manually if appropriate. Once three retraining
// cycles have themselves been failed, the person is flagged for
// job-reassignment review per SOP QbD-QA-SOP-007 Section 5.11.
async function handleNeedsRetraining(
  tx:   Prisma.TransactionClient,
  opts: { assignmentId: string; personId: string; topicId: string; maxAttempts: number }
) {
  await tx.trainingAssignment.update({
    where: { id: opts.assignmentId },
    data:  { status: 'FAILED' },
  })

  // Completed/failed retraining cycles so far for this person+topic
  const totalRetrain = await tx.trainingAssignment.count({
    where: {
      personId: opts.personId,
      topicId:  opts.topicId,
      trigger:  'SCHEDULE',
      status:   { in: ['FAILED', 'COMPLETED'] },
    },
  })

  const [person, topic] = await Promise.all([
    tx.person.findUnique({ where: { id: opts.personId }, select: { name: true, employeeId: true } }),
    tx.trainingTopic.findUnique({ where: { id: opts.topicId }, select: { name: true } }),
  ])

  const trainers = await tx.person.findMany({
    where:  { isActive: true, roles: { some: { role: 'TRAINER' } } },
    select: { id: true },
  })

  if (totalRetrain >= 3) {
    // ── 3 cycles exhausted — flag person for job-reassignment review ──
    await tx.person.update({
      where: { id: opts.personId },
      data:  {
        flaggedForJobReassignment: true,
        flaggedAt:      new Date(),
        flagTopicId:    opts.topicId,
        flagCycleCount: totalRetrain,
        flagReason:     `${person?.name ?? 'This analyst'} (${person?.employeeId}) failed "${topic?.name}" training after ${totalRetrain} complete retraining cycles. Job reassignment review required per SOP QbD-QA-SOP-007 Section 5.11.`,
        resolvedAt:       null,
        resolvedById:     null,
        resolutionAction: null,
        resolutionNotes:  null,
      },
    })

    await tx.notification.create({
      data: {
        personId: opts.personId,
        type:     'RETRAINING',
        channel:  'IN_APP',
        title:    'Training escalated to coordinator',
        message:  `You have been unable to achieve competency on "${topic?.name}" after ${totalRetrain} retraining cycles. Your Training Coordinator has been notified and will contact you regarding your job responsibilities.`,
      },
    })

    if (trainers.length > 0) {
      await tx.notification.createMany({
        data: trainers.map((th) => ({
          personId: th.id,
          type:     'RETRAINING' as const,
          channel:  'IN_APP'     as const,
          title:    `Job reassignment review — ${person?.name} (${person?.employeeId})`,
          message:  `${person?.name} has failed "${topic?.name}" training after ${totalRetrain} complete retraining cycles. Per SOP QbD-QA-SOP-007 Section 5.11, job responsibilities must be reviewed. Go to Admin → Flagged Persons to take action.`,
        })),
      })
    }
    return
  }

  // ── Under 3 cycles — NOTIFY ONLY. No assignment is created; a Trainer
  // assigns retraining manually if it is warranted. ──
  await tx.notification.create({
    data: {
      personId: opts.personId,
      type:     'RETRAINING',
      channel:  'IN_APP',
      title:    'Assessment not passed',
      message:  `You did not pass "${topic?.name}" after ${opts.maxAttempts} attempts. Your Trainer has been notified and will review whether retraining is assigned — no new assignment has been created automatically.`,
    },
  })

  if (trainers.length > 0) {
    await tx.notification.createMany({
      data: trainers.map((th) => ({
        personId: th.id,
        type:     'RETRAINING' as const,
        channel:  'IN_APP'     as const,
        title:    `Retraining review — ${person?.name} (${person?.employeeId})`,
        message:  `${person?.name} (${person?.employeeId}) failed "${topic?.name}" after ${opts.maxAttempts} attempts. This would be retraining cycle ${totalRetrain + 1} of 3. Review and assign a retraining if appropriate — the system no longer creates it automatically.`,
      })),
    })
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
  select: {
    id: true, personId: true, topicId: true, status: true, trigger: true, questionBankVersionId: true,
    topic: {
      select: {
        materials: { where: { status: 'APPROVED' }, select: { id: true } },
      },
    },
  },
})
  if (!assignment)                       throw new Error('Assignment not found')
  if (assignment.personId !== actorId)   throw new Error('Not authorised')
  if (!assignment.questionBankVersionId) throw new Error('No question version is pinned for this assignment')

  if (assignment.topic.materials.length > 0) {
    const confirmedCount = await prisma.assignmentMaterialConfirmation.count({
      where: { assignmentId: input.assignmentId },
    })
    if (confirmedCount < assignment.topic.materials.length) {
      throw new Error('You must review and confirm all training material before attempting the assessment')
    }
  }

  const bank = await prisma.questionBank.findUnique({
    where:  { id: input.bankId },
    select: { id: true, passingPercentage: true, maxAttempts: true },
  })
  if (!bank) throw new Error('Questions not found')

  // Re-check attempt limit server-side (never trust the client)
  const previousAttempts = await prisma.assessmentAttempt.count({
    where: { personId: actorId, bankId: input.bankId, assignmentId: input.assignmentId },
  })
  if (previousAttempts >= bank.maxAttempts) {
    throw new Error('Maximum attempts exceeded')
  }

  // Fetch correct answers for ONLY the questions that were actually answered,
  // scoped to the version pinned on the assignment — never whatever the bank
  // currently looks like — so grading always matches what the trainee saw.
  const questionIds = Object.keys(input.answers)
  const questions    = await prisma.question.findMany({
    where:  { id: { in: questionIds }, bankVersionId: assignment.questionBankVersionId },
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
        personId:      actorId,
        bankId:        input.bankId,
        bankVersionId: assignment.questionBankVersionId!,
        assignmentId:  input.assignmentId,
        attemptNo,
        score,
        outcome,
        answers:       input.answers,
        startedAt:     new Date(input.startedAt),
        submittedAt:   new Date(),
      },
    })

    if (outcome === 'PASS') {
      await tx.trainingAssignment.update({
        where: { id: input.assignmentId },
        data:  { status: 'COMPLETED', completedAt: new Date() },
      })
    } else if (outcome === 'NEEDS_RETRAINING') {
      await handleNeedsRetraining(tx, {
        assignmentId: input.assignmentId,
        personId:     actorId,
        topicId:      assignment.topicId,
        maxAttempts:  bank.maxAttempts,
      })
    } else {
      // FAIL but attempts remain — keep assignment IN_PROGRESS
      await tx.trainingAssignment.update({
        where: { id: input.assignmentId },
        data:  { status: 'IN_PROGRESS' },
      })
    }
  })

  // Sync linked refresher trigger if this was a refresher-driven assessment
  if (outcome === 'PASS' && assignment.trigger === 'REFRESHER') {
    await syncRefresherCompletion(assignment.personId, assignment.topicId)
  }

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
  personId?:    string
  bankId?:      string
  assignmentId?: string   // ← add this
}) {
  return prisma.assessmentAttempt.findMany({
    where: {
      ...(filters?.personId     && { personId:     filters.personId     }),
      ...(filters?.bankId       && { bankId:        filters.bankId       }),
      ...(filters?.assignmentId && { assignmentId: filters.assignmentId }), // ← add
    },
    select: {
      id:           true,
      attemptNo:    true,
      score:        true,
      outcome:      true,
      startedAt:    true,
      submittedAt:  true,
      assignmentId: true,
      bankId:       true,
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
      isActive:     true,
      trainingType: 'MATERIAL_MCQ',
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
      currentVersion: {
        select: {
          versionNo:    true,
          versionLabel: true,
          _count:       { select: { questions: true } },
        },
      },
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
  // Verify actor is a Trainer/Guest Trainer
  const actor = await prisma.person.findUnique({
    where:  { id: actorId },
    select: { name: true, roles: { select: { role: true } } },
  })
  const actorRoles = actor?.roles.map((r) => r.role) ?? []
  if (!actor || !hasAnyRole({ roles: actorRoles }, ['TRAINER', 'GUEST_TRAINER'])) {
    throw new Error('Only Trainers can record oral assessment outcomes')
  }

  const assignment = await prisma.trainingAssignment.findUnique({
    where:  { id: input.assignmentId },
    select: { id: true, personId: true, topicId: true, status: true, trigger: true, questionBankVersionId: true },
  })
  if (!assignment) throw new Error('Assignment not found')
  if (!assignment.questionBankVersionId) throw new Error('No question version is pinned for this assignment')

  const bank = await prisma.questionBank.findUnique({
    where:  { id: input.bankId },
    select: { id: true, maxAttempts: true, passingPercentage: true },
  })
  if (!bank) throw new Error('Assessment questions not found')

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
        personId:      assignment.personId,
        bankId:        input.bankId,
        bankVersionId: assignment.questionBankVersionId!,
        assignmentId:  input.assignmentId,
        attemptNo,
        score,
        outcome,
        answers:       { oral: true, recordedBy: actorId, notes: input.notes ?? '' },
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
      await handleNeedsRetraining(tx, {
        assignmentId: input.assignmentId,
        personId:     assignment.personId,
        topicId:      assignment.topicId,
        maxAttempts:  bank.maxAttempts,
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