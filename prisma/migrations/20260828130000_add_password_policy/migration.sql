-- CreateTable
CREATE TABLE "password_policies" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "policyName" TEXT NOT NULL DEFAULT 'Password Policy',
    "authMode" TEXT NOT NULL DEFAULT 'DB',
    "passwordExpiryDays" INTEGER NOT NULL DEFAULT 45,
    "failedAttemptLimit" INTEGER NOT NULL DEFAULT 3,
    "minPasswordLength" INTEGER NOT NULL DEFAULT 8,
    "passwordHistoryCount" INTEGER NOT NULL DEFAULT 3,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_policies_key_key" ON "password_policies"("key");

-- Seed the single default row
INSERT INTO "password_policies" ("id", "key", "updatedAt")
VALUES ('pwpolicy_default', 'default', CURRENT_TIMESTAMP);
