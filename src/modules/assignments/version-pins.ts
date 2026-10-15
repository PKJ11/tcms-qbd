import type { Prisma, TrainingType } from '@prisma/client'

export type PrismaTx = Prisma.TransactionClient

export interface VersionPins {
  trainingType:          TrainingType
  questionBankVersionId: string | null
  materialPins: { materialId: string; materialVersionId: string }[]
}

// Resolves the question-bank version and per-material versions that are
// currently live for a topic, so a newly created TrainingAssignment can pin
// exactly what was used — traceable even after the bank/materials change later.
export async function resolveVersionPins(tx: PrismaTx, topicId: string): Promise<VersionPins> {
  const topic = await tx.trainingTopic.findUniqueOrThrow({
    where:  { id: topicId },
    select: { trainingType: true },
  })

  const bank = await tx.questionBank.findUnique({
    where:  { topicId },
    select: { currentVersionId: true },
  })

  const materials = await tx.trainingMaterial.findMany({
    where:  { topicId, status: 'APPROVED' },
    select: {
      id: true,
      versions: {
        where:   { status: 'APPROVED' },
        orderBy: { versionNo: 'desc' },
        take:    1,
        select:  { id: true },
      },
    },
  })

  return {
    trainingType:          topic.trainingType,
    questionBankVersionId: bank?.currentVersionId ?? null,
    materialPins: materials
      .filter((m) => m.versions[0])
      .map((m) => ({ materialId: m.id, materialVersionId: m.versions[0].id })),
  }
}

// Bulk-creates the AssignmentMaterialVersion pin rows for a batch of newly
// created assignments — call once per createMany, not per assignment.
export async function pinAssignmentMaterialVersions(
  tx:            PrismaTx,
  assignmentIds: string[],
  materialPins:  VersionPins['materialPins']
) {
  if (assignmentIds.length === 0 || materialPins.length === 0) return

  await tx.assignmentMaterialVersion.createMany({
    data: assignmentIds.flatMap((assignmentId) =>
      materialPins.map((p) => ({
        assignmentId,
        materialId:        p.materialId,
        materialVersionId: p.materialVersionId,
      }))
    ),
  })
}
