-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('MCQ', 'ORAL');

-- AlterTable
ALTER TABLE "question_banks" ADD COLUMN     "assessmentType" "AssessmentType" NOT NULL DEFAULT 'MCQ';

-- AlterTable
ALTER TABLE "training_assignments" ADD COLUMN     "needBasis" TEXT,
ADD COLUMN     "needIdentifiedById" TEXT;
