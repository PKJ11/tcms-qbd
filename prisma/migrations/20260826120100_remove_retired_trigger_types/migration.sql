-- Training types are now limited to Induction | Schedule | Refresher.
-- Remap existing assignments that used the retired trigger types
-- (Role upgrade, Retraining, Technical, External training) onto Schedule
-- before rebuilding the enum without them.
UPDATE "training_assignments"
SET "trigger" = 'SCHEDULE'
WHERE "trigger" IN ('UPGRADE', 'RETRAINING', 'TECHNICAL', 'EXTERNAL');

-- AlterEnum
CREATE TYPE "TrainingTrigger_new" AS ENUM ('INDUCTION', 'SCHEDULE', 'REFRESHER');
ALTER TABLE "training_assignments" ALTER COLUMN "trigger" TYPE "TrainingTrigger_new" USING ("trigger"::text::"TrainingTrigger_new");
ALTER TYPE "TrainingTrigger" RENAME TO "TrainingTrigger_old";
ALTER TYPE "TrainingTrigger_new" RENAME TO "TrainingTrigger";
DROP TYPE "TrainingTrigger_old";
