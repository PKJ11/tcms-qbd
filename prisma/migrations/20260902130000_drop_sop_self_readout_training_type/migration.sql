-- SOP_SELF_READOUT is no longer a training type — it remains only as an
-- assignment trigger (TrainingTrigger). Existing SOP-self-readout topics
-- become MATERIAL_ONLY, whose completion behaviour is identical.

-- 1. Re-point existing rows.
UPDATE "training_topics"
SET "trainingType" = 'MATERIAL_ONLY'
WHERE "trainingType" = 'SOP_SELF_READOUT';

-- 2. Rebuild the TrainingType enum without the value.
ALTER TYPE "TrainingType" RENAME TO "TrainingType_old";
CREATE TYPE "TrainingType" AS ENUM ('MATERIAL_MCQ', 'MATERIAL_ONLY', 'ACKNOWLEDGEMENT_ONLY');
ALTER TABLE "training_topics" ALTER COLUMN "trainingType" DROP DEFAULT;
ALTER TABLE "training_topics"
  ALTER COLUMN "trainingType" TYPE "TrainingType"
  USING ("trainingType"::text::"TrainingType");
ALTER TABLE "training_topics" ALTER COLUMN "trainingType" SET DEFAULT 'MATERIAL_MCQ';
DROP TYPE "TrainingType_old";
