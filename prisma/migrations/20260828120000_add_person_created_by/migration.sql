-- AlterTable
ALTER TABLE "persons" ADD COLUMN "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
