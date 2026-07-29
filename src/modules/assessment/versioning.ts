'use server'

import { prisma }        from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import { stageQuestionSchema } from './schema'
import type { StageQuestionInput, VersionDiffSummary } from './types'

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

export async function getWorkingSet(bankId: string, actorId: string) {
  return ensureWorkingSet(bankId, actorId)
}

export async function stageNewQuestion(
  bankId:  string,
  input:   StageQuestionInput,
  actorId: string
) {
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
  const item = await prisma.questionBankWorkingSetItem.findUnique({ where: { id: itemId } })
  if (!item) throw new Error('Staged question not found')

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
