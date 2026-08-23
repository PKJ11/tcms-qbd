'use server'

import { prisma } from '@/lib/prisma'
import { assertTopicContentAccess } from '@/modules/topics'

// ─────────────────────────────────────────────────────────────────
// QUESTION BANK ACCESS CONTROL
//
// Editing a bank's questions is governed by the same topic-level access
// grant as material upload — see modules/topics/access.ts. A bank always
// belongs to exactly one topic, so this just resolves to that topic and
// defers the actual check.
// ─────────────────────────────────────────────────────────────────

export async function assertQuestionBankEditAccess(bankId: string, actorId: string): Promise<void> {
  const bank = await prisma.questionBank.findUnique({
    where:  { id: bankId },
    select: { topicId: true },
  })
  if (!bank) throw new Error('Questions not found')
  await assertTopicContentAccess(bank.topicId, actorId)
}

// Same check, but for endpoints that only have a staged working-set item id.
export async function assertWorkingSetItemEditAccess(itemId: string, actorId: string): Promise<void> {
  const item = await prisma.questionBankWorkingSetItem.findUnique({
    where:  { id: itemId },
    select: { workingSet: { select: { bankId: true } } },
  })
  if (!item) throw new Error('Staged question not found')
  await assertQuestionBankEditAccess(item.workingSet.bankId, actorId)
}
