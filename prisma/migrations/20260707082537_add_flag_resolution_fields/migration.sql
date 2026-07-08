-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "flagCycleCount" INTEGER,
ADD COLUMN     "flagTopicId" TEXT,
ADD COLUMN     "resolutionAction" TEXT,
ADD COLUMN     "resolutionNotes" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedById" TEXT;
