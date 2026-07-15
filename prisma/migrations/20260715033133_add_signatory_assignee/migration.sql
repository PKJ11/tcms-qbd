-- AlterTable
ALTER TABLE "signatory_entries" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedById" TEXT,
ADD COLUMN     "assignedToId" TEXT;

-- AddForeignKey
ALTER TABLE "signatory_entries" ADD CONSTRAINT "signatory_entries_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatory_entries" ADD CONSTRAINT "signatory_entries_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
