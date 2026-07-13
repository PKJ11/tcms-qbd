-- CreateEnum
CREATE TYPE "TrainingType" AS ENUM ('MATERIAL_MCQ', 'MATERIAL_ONLY', 'ACKNOWLEDGEMENT_ONLY');

-- DropForeignKey
ALTER TABLE "topic_departments" DROP CONSTRAINT "topic_departments_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "topic_departments" DROP CONSTRAINT "topic_departments_topicId_fkey";

-- AlterTable
ALTER TABLE "training_assignments" ADD COLUMN     "viewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "training_topics" ADD COLUMN     "trainingType" "TrainingType" NOT NULL DEFAULT 'MATERIAL_MCQ';

-- DropTable
DROP TABLE "topic_departments";

-- CreateTable
CREATE TABLE "topic_scopes" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "unitId" TEXT,
    "sectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_scopes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "topic_scopes" ADD CONSTRAINT "topic_scopes_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "training_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_scopes" ADD CONSTRAINT "topic_scopes_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_scopes" ADD CONSTRAINT "topic_scopes_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_scopes" ADD CONSTRAINT "topic_scopes_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

