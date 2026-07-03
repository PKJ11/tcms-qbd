-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TrainingTrigger" ADD VALUE 'TECHNICAL';
ALTER TYPE "TrainingTrigger" ADD VALUE 'EXTERNAL';

-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "flagReason" TEXT,
ADD COLUMN     "flaggedAt" TIMESTAMP(3),
ADD COLUMN     "flaggedForJobReassignment" BOOLEAN NOT NULL DEFAULT false;
