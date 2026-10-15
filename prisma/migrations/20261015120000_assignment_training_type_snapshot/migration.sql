-- Snapshot the topic's training type onto each assignment, so upgrading a
-- topic's type later never changes what an already-issued assignment requires.
ALTER TABLE "training_assignments" ADD COLUMN "trainingType" "TrainingType";

-- Backfill existing assignments from their topic's current type
UPDATE "training_assignments" a
SET    "trainingType" = t."trainingType"
FROM   "training_topics" t
WHERE  a."topicId" = t."id";

ALTER TABLE "training_assignments" ALTER COLUMN "trainingType" SET NOT NULL;
