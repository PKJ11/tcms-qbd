-- DropForeignKey
ALTER TABLE "training_calendar_rows" DROP CONSTRAINT "training_calendar_rows_createdById_fkey";

-- AlterTable
ALTER TABLE "training_calendar_rows" ADD COLUMN "topicId" TEXT;
ALTER TABLE "training_calendar_rows" ALTER COLUMN "createdById" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "training_calendar_rows_departmentId_topicId_key" ON "training_calendar_rows"("departmentId", "topicId");

-- AddForeignKey
ALTER TABLE "training_calendar_rows" ADD CONSTRAINT "training_calendar_rows_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "training_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_calendar_rows" ADD CONSTRAINT "training_calendar_rows_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
