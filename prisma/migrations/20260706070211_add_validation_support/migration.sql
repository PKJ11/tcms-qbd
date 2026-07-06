-- CreateEnum
CREATE TYPE "TestPhase" AS ENUM ('IQ', 'OQ', 'PQ', 'RT');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('NOT_EXECUTED', 'PASS', 'FAIL', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETE', 'LOCKED');

-- CreateTable
CREATE TABLE "validation_runs" (
    "id" TEXT NOT NULL,
    "phase" "TestPhase" NOT NULL,
    "version" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "status" "ValidationStatus" NOT NULL DEFAULT 'PLANNED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "executedById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_cases" (
    "id" TEXT NOT NULL,
    "ursId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "phase" "TestPhase" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'M',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_results" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "status" "TestStatus" NOT NULL DEFAULT 'NOT_EXECUTED',
    "actualResult" TEXT,
    "defectNotes" TEXT,
    "executedById" TEXT,
    "executedAt" TIMESTAMP(3),
    "screenshotUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "test_results_runId_testCaseId_key" ON "test_results"("runId", "testCaseId");

-- AddForeignKey
ALTER TABLE "validation_runs" ADD CONSTRAINT "validation_runs_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_runs" ADD CONSTRAINT "validation_runs_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_runId_fkey" FOREIGN KEY ("runId") REFERENCES "validation_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "test_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
