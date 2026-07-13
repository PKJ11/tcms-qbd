-- CreateTable
CREATE TABLE "assignment_material_confirmations" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_material_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assignment_material_confirmations_assignmentId_materialId_key" ON "assignment_material_confirmations"("assignmentId", "materialId");

-- AddForeignKey
ALTER TABLE "assignment_material_confirmations" ADD CONSTRAINT "assignment_material_confirmations_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "training_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_material_confirmations" ADD CONSTRAINT "assignment_material_confirmations_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "training_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
