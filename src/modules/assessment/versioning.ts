'use server'

import { prisma }        from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import { stageQuestionSchema, findDuplicateOption } from './schema'
import type { StageQuestionInput, VersionDiffSummary } from './types'
import { assertQuestionBankEditAccess, assertWorkingSetItemEditAccess } from './access'

// ─────────────────────────────────────────────────────────────────
// WORKING SET — staged edits, nothing here is real until Save Changes
// ─────────────────────────────────────────────────────────────────

const CLONE_SELECT = {
  id:            true,
  questionText:  true,
  optionA:       true,
  optionB:       true,
  optionC:       true,
  optionD:       true,
  correctAnswer: true,
  isActive:      true,
} as const

async function ensureWorkingSet(bankId: string, actorId: string) {
  const existing = await prisma.questionBankWorkingSet.findUnique({
    where:   { bankId },
    include: { items: { orderBy: { id: 'asc' } } },
  })
  if (existing) return existing

  const bank = await prisma.questionBank.findUnique({
    where:  { id: bankId },
    select: {
      currentVersion: { select: { id: true, questions: { select: CLONE_SELECT, orderBy: { createdAt: 'asc' } } } },
    },
  })
  if (!bank?.currentVersion) throw new Error('Question bank has no version to edit from')

  return prisma.questionBankWorkingSet.create({
    data: {
      bankId,
      baseVersionId: bank.currentVersion.id,
      updatedById:   actorId,
      items: {
        create: bank.currentVersion.questions.map((q) => ({
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
    include: { items: { orderBy: { id: 'asc' } } },
  })
}

async function isVersionUsed(versionId: string): Promise<boolean> {
  const [assignmentCount, attemptCount] = await Promise.all([
    prisma.trainingAssignment.count({ where: { questionBankVersionId: versionId } }),
    prisma.assessmentAttempt.count({ where: { bankVersionId: versionId } }),
  ])
  return assignmentCount + attemptCount > 0
}

const LOCKED_MESSAGE =
  'This version has already been used by a training assignment and can no longer be applied to directly — save a new version instead.'

export async function getWorkingSet(bankId: string, actorId: string) {
  const workingSet = await ensureWorkingSet(bankId, actorId)
  const isBaseVersionUsed = await isVersionUsed(workingSet.baseVersionId)
  return { ...workingSet, isBaseVersionUsed }
}

export async function stageNewQuestion(
  bankId:  string,
  input:   StageQuestionInput,
  actorId: string
) {
  await assertQuestionBankEditAccess(bankId, actorId)

  const parsed = stageQuestionSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.message)

  const workingSet = await ensureWorkingSet(bankId, actorId)

  return prisma.$transaction(async (tx) => {
    const item = await tx.questionBankWorkingSetItem.create({
      data: {
        workingSetId:     workingSet.id,
        sourceQuestionId: null,
        questionText:     input.questionText,
        optionA:          input.optionA,
        optionB:          input.optionB,
        optionC:          input.optionC,
        optionD:          input.optionD,
        correctAnswer:    input.correctAnswer,
        isActive:         true,
      },
    })
    await tx.questionBankWorkingSet.update({
      where: { id: workingSet.id },
      data:  { updatedById: actorId },
    })
    return item
  })
}

export async function stageQuestionEdit(
  itemId:  string,
  input:   Partial<StageQuestionInput>,
  actorId: string
) {
  await assertWorkingSetItemEditAccess(itemId, actorId)

  const item = await prisma.questionBankWorkingSetItem.findUnique({ where: { id: itemId } })
  if (!item) throw new Error('Staged question not found')

  const duplicateField = findDuplicateOption({
    optionA: input.optionA ?? item.optionA,
    optionB: input.optionB ?? item.optionB,
    optionC: input.optionC ?? item.optionC,
    optionD: input.optionD ?? item.optionD,
  })
  if (duplicateField) throw new Error('Options must all be different')

  return prisma.$transaction(async (tx) => {
    const updated = await tx.questionBankWorkingSetItem.update({
      where: { id: itemId },
      data:  {
        ...(input.questionText  !== undefined && { questionText:  input.questionText  }),
        ...(input.optionA       !== undefined && { optionA:       input.optionA       }),
        ...(input.optionB       !== undefined && { optionB:       input.optionB       }),
        ...(input.optionC       !== undefined && { optionC:       input.optionC       }),
        ...(input.optionD       !== undefined && { optionD:       input.optionD       }),
        ...(input.correctAnswer !== undefined && { correctAnswer: input.correctAnswer }),
      },
    })
    await tx.questionBankWorkingSet.update({
      where: { id: item.workingSetId },
      data:  { updatedById: actorId },
    })
    return updated
  })
}

export async function stageArchiveToggle(
  itemId:   string,
  isActive: boolean,
  actorId:  string
) {
  await assertWorkingSetItemEditAccess(itemId, actorId)

  const item = await prisma.questionBankWorkingSetItem.findUnique({ where: { id: itemId } })
  if (!item) throw new Error('Staged question not found')

  return prisma.$transaction(async (tx) => {
    const updated = await tx.questionBankWorkingSetItem.update({
      where: { id: itemId },
      data:  { isActive },
    })
    await tx.questionBankWorkingSet.update({
      where: { id: item.workingSetId },
      data:  { updatedById: actorId },
    })
    return updated
  })
}

// Removes a staged-new question that hasn't been saved yet. A question that
// came from a previous version can only be archived, never deleted outright.
export async function discardStagedItem(itemId: string, actorId: string) {
  await assertWorkingSetItemEditAccess(itemId, actorId)

  const item = await prisma.questionBankWorkingSetItem.findUnique({ where: { id: itemId } })
  if (!item) throw new Error('Staged question not found')
  if (item.sourceQuestionId) {
    throw new Error('Only a newly added, unsaved question can be discarded — archive it instead')
  }

  await prisma.$transaction(async (tx) => {
    await tx.questionBankWorkingSetItem.delete({ where: { id: itemId } })
    await tx.questionBankWorkingSet.update({
      where: { id: item.workingSetId },
      data:  { updatedById: actorId },
    })
  })
}

// "Select a previous version" — reloads the working set from that version's
// exact snapshot. Purely exploratory: no QuestionBankVersion is created and
// QuestionBank.currentVersionId is untouched until Save Changes runs.
export async function rebaseWorkingSet(
  bankId:        string,
  baseVersionId: string,
  actorId:       string
) {
  await assertQuestionBankEditAccess(bankId, actorId)

  const version = await prisma.questionBankVersion.findUnique({
    where:  { id: baseVersionId },
    select: { id: true, bankId: true, questions: { select: CLONE_SELECT, orderBy: { createdAt: 'asc' } } },
  })
  if (!version || version.bankId !== bankId) throw new Error('Version not found for this bank')

  const workingSet = await ensureWorkingSet(bankId, actorId)

  await prisma.$transaction(async (tx) => {
    await tx.questionBankWorkingSetItem.deleteMany({ where: { workingSetId: workingSet.id } })
    await tx.questionBankWorkingSet.update({
      where: { id: workingSet.id },
      data:  {
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
  })

  return getWorkingSet(bankId, actorId)
}

// ─────────────────────────────────────────────────────────────────
// SAVE CHANGES — materializes the working set into a new immutable version
// ─────────────────────────────────────────────────────────────────

export async function saveQuestionBankVersion(
  bankId:        string,
  versionLabel:  string,
  justification: string,
  actorId:       string
): Promise<{ version: { id: string; versionNo: number; versionLabel: string }; diff: VersionDiffSummary }> {
  await assertQuestionBankEditAccess(bankId, actorId)

  const label = versionLabel?.trim()
  if (!label) throw new Error('Version name is required')

  const workingSet = await prisma.questionBankWorkingSet.findUnique({
    where:   { bankId },
    include: {
      items: true,
      base:  { select: { id: true, questions: { select: CLONE_SELECT } } },
    },
  })
  if (!workingSet) throw new Error('No staged changes to save')
  if (workingSet.items.length === 0) throw new Error('A version must contain at least one question')

  const baseQuestionsById = new Map(workingSet.base.questions.map((q) => [q.id, q]))
  const diff: VersionDiffSummary = { added: 0, archived: 0, restored: 0, edited: 0 }

  for (const item of workingSet.items) {
    const original = item.sourceQuestionId ? baseQuestionsById.get(item.sourceQuestionId) : undefined
    if (!original) { diff.added++; continue }
    if (original.isActive && !item.isActive)      { diff.archived++;  continue }
    if (!original.isActive && item.isActive)      { diff.restored++;  continue }
    if (
      original.questionText  !== item.questionText  ||
      original.optionA       !== item.optionA       ||
      original.optionB       !== item.optionB       ||
      original.optionC       !== item.optionC       ||
      original.optionD       !== item.optionD       ||
      original.correctAnswer !== item.correctAnswer
    ) diff.edited++
  }

  const lastVersion = await prisma.questionBankVersion.findFirst({
    where:   { bankId },
    orderBy: { versionNo: 'desc' },
    select:  { versionNo: true },
  })
  const versionNo = (lastVersion?.versionNo ?? 0) + 1

  const newVersion = await prisma.$transaction(async (tx) => {
    const version = await tx.questionBankVersion.create({
      data: {
        bankId,
        versionNo,
        versionLabel:     label,
        basedOnVersionId: workingSet.baseVersionId,
        createdById:      actorId,
        questions: {
          create: workingSet.items.map((item) => ({
            questionText:  item.questionText,
            optionA:       item.optionA,
            optionB:       item.optionB,
            optionC:       item.optionC,
            optionD:       item.optionD,
            correctAnswer: item.correctAnswer,
            isActive:      item.isActive,
          })),
        },
      },
      include: { questions: { select: CLONE_SELECT, orderBy: { createdAt: 'asc' } } },
    })

    await tx.questionBank.update({
      where: { id: bankId },
      data:  { currentVersionId: version.id },
    })

    // Reset the working set onto the version that was just saved so the
    // trainer can keep editing seamlessly.
    await tx.questionBankWorkingSetItem.deleteMany({ where: { workingSetId: workingSet.id } })
    await tx.questionBankWorkingSet.update({
      where: { id: workingSet.id },
      data:  {
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

    return version
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'CREATE',
    module:        'ASSESSMENT',
    recordId:      newVersion.id,
    recordType:    'QuestionBankVersion',
    beforeValue:   { basedOnVersionId: workingSet.baseVersionId },
    afterValue:    { versionNo, versionLabel: label, ...diff },
    justification,
  })

  return {
    version: { id: newVersion.id, versionNo: newVersion.versionNo, versionLabel: newVersion.versionLabel },
    diff,
  }
}

// ─────────────────────────────────────────────────────────────────
// APPLY DIRECTLY — commits the staged working set into the EXISTING
// version's real Question rows, in place. Only ever allowed when that
// version has never been used by an assignment/attempt — nothing depends
// on its exact content yet, so this doesn't rewrite anyone's history.
// ─────────────────────────────────────────────────────────────────

export async function applyChangesToCurrentVersion(
  bankId:        string,
  justification: string,
  actorId:       string
): Promise<{ versionId: string; diff: VersionDiffSummary }> {
  await assertQuestionBankEditAccess(bankId, actorId)

  const bank = await prisma.questionBank.findUnique({
    where:  { id: bankId },
    select: { currentVersionId: true },
  })
  if (!bank?.currentVersionId) throw new Error('Question bank has no version yet')

  const workingSet = await prisma.questionBankWorkingSet.findUnique({
    where:   { bankId },
    include: {
      items: true,
      base:  { select: { id: true, questions: { select: CLONE_SELECT } } },
    },
  })
  if (!workingSet) throw new Error('No staged changes to apply')
  if (workingSet.items.length === 0) throw new Error('A version must contain at least one question')

  // Only the LIVE current version can be edited this way — if the working
  // set has been rebased onto an older reference version, that's not "the"
  // version anymore and must go through Save as new version instead.
  if (workingSet.baseVersionId !== bank.currentVersionId) {
    throw new Error('The working set is not based on the current version — switch back to it, or save as a new version instead')
  }
  if (await isVersionUsed(bank.currentVersionId)) throw new Error(LOCKED_MESSAGE)

  const baseQuestionsById = new Map(workingSet.base.questions.map((q) => [q.id, q]))
  const diff: VersionDiffSummary = { added: 0, archived: 0, restored: 0, edited: 0 }

  for (const item of workingSet.items) {
    const original = item.sourceQuestionId ? baseQuestionsById.get(item.sourceQuestionId) : undefined
    if (!original) { diff.added++; continue }
    if (original.isActive && !item.isActive)      { diff.archived++;  continue }
    if (!original.isActive && item.isActive)      { diff.restored++;  continue }
    if (
      original.questionText  !== item.questionText  ||
      original.optionA       !== item.optionA       ||
      original.optionB       !== item.optionB       ||
      original.optionC       !== item.optionC       ||
      original.optionD       !== item.optionD       ||
      original.correctAnswer !== item.correctAnswer
    ) diff.edited++
  }

  const versionId = bank.currentVersionId

  await prisma.$transaction(async (tx) => {
    for (const item of workingSet.items) {
      if (item.sourceQuestionId) {
        await tx.question.update({
          where: { id: item.sourceQuestionId },
          data:  {
            questionText:  item.questionText,
            optionA:       item.optionA,
            optionB:       item.optionB,
            optionC:       item.optionC,
            optionD:       item.optionD,
            correctAnswer: item.correctAnswer,
            isActive:      item.isActive,
          },
        })
      } else {
        await tx.question.create({
          data: {
            bankVersionId: versionId,
            questionText:  item.questionText,
            optionA:       item.optionA,
            optionB:       item.optionB,
            optionC:       item.optionC,
            optionD:       item.optionD,
            correctAnswer: item.correctAnswer,
            isActive:      item.isActive,
          },
        })
      }
    }

    // Re-sync the working set from the now-updated real rows so newly
    // added questions get a sourceQuestionId and everything reads as
    // "no pending changes" again.
    const refreshed = await tx.question.findMany({
      where:   { bankVersionId: versionId },
      select:  CLONE_SELECT,
      orderBy: { createdAt: 'asc' },
    })
    await tx.questionBankWorkingSetItem.deleteMany({ where: { workingSetId: workingSet.id } })
    await tx.questionBankWorkingSet.update({
      where: { id: workingSet.id },
      data:  {
        updatedById: actorId,
        items: {
          create: refreshed.map((q) => ({
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
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'UPDATE',
    module:        'ASSESSMENT',
    recordId:      versionId,
    recordType:    'QuestionBankVersion',
    beforeValue:   null,
    afterValue:    { appliedDirectly: true, ...diff },
    justification,
  })

  return { versionId, diff }
}

// ─────────────────────────────────────────────────────────────────
// HISTORY — read-only browsing for trainer + viewer
// ─────────────────────────────────────────────────────────────────

export async function getQuestionBankVersions(bankId: string) {
  return prisma.questionBankVersion.findMany({
    where:  { bankId },
    select: {
      id:               true,
      versionNo:        true,
      versionLabel:     true,
      basedOnVersionId: true,
      createdAt:        true,
      createdBy:        { select: { id: true, name: true } },
      _count:           { select: { questions: true } },
    },
    orderBy: { versionNo: 'desc' },
  })
}

export async function getQuestionBankVersionQuestions(versionId: string) {
  const version = await prisma.questionBankVersion.findUnique({
    where:  { id: versionId },
    select: {
      id:           true,
      bankId:       true,
      versionNo:    true,
      versionLabel: true,
      createdAt:    true,
      createdBy:    { select: { id: true, name: true } },
      questions:    { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!version) throw new Error('Version not found')
  return version
}
