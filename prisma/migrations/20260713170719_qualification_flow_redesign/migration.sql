-- Techniques carry no validity/expiry period anymore
ALTER TABLE "techniques" DROP COLUMN "qualificationPeriodDays";

-- Certificates no longer have a computed expiry (qualifications never expire)
ALTER TABLE "certificates" ALTER COLUMN "validUntil" DROP NOT NULL;

-- Redefine SignatoryRole to department-scoped labels: existing rows map
-- TRAINER -> QC_TRAINER (old step-1 label), everything else -> QA_TRAINER
ALTER TYPE "SignatoryRole" RENAME TO "SignatoryRole_old";
CREATE TYPE "SignatoryRole" AS ENUM ('QC_TRAINER', 'QA_TRAINER');
ALTER TABLE "signatory_entries"
  ALTER COLUMN "requiredRole" TYPE "SignatoryRole"
  USING (CASE "requiredRole"::text
           WHEN 'TRAINER' THEN 'QC_TRAINER'
           ELSE 'QA_TRAINER'
         END)::"SignatoryRole";
DROP TYPE "SignatoryRole_old";
