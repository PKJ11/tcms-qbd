-- CreateTable
CREATE TABLE "work_drafts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "draftKey" TEXT NOT NULL,
    "routePath" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_drafts_userId_idx" ON "work_drafts"("userId");

-- CreateIndex
CREATE INDEX "work_drafts_expiresAt_idx" ON "work_drafts"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "work_drafts_userId_draftKey_key" ON "work_drafts"("userId", "draftKey");

-- AddForeignKey
ALTER TABLE "work_drafts" ADD CONSTRAINT "work_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
