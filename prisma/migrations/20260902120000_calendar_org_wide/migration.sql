-- Collapse the department-wise Training Calendar into one organisation-wide
-- calendar: drop the department dimension, keep a single row per topic.

-- 1. Merge duplicate topic-backed rows (same topic on several departments'
--    calendars). Keep the oldest row per topic; move its siblings' month
--    marks onto it, skipping any month the kept row already has.
UPDATE "training_calendar_marks" m
SET "rowId" = k.keep_id
FROM (
  SELECT id,
         first_value(id) OVER (PARTITION BY "topicId" ORDER BY "createdAt", id) AS keep_id
  FROM "training_calendar_rows"
  WHERE "topicId" IS NOT NULL
) k
WHERE m."rowId" = k.id
  AND k.id <> k.keep_id
  AND NOT EXISTS (
    SELECT 1 FROM "training_calendar_marks" x
    WHERE x."rowId" = k.keep_id AND x."year" = m."year" AND x."month" = m."month"
  );

-- 2. Delete the now-redundant sibling rows (their remaining marks, if any,
--    are duplicates and cascade-delete with the row).
DELETE FROM "training_calendar_rows" a
USING (
  SELECT id,
         row_number() OVER (PARTITION BY "topicId" ORDER BY "createdAt", id) AS rn
  FROM "training_calendar_rows"
  WHERE "topicId" IS NOT NULL
) r
WHERE a.id = r.id AND r.rn > 1;

-- 3. Drop the department dimension.
DROP INDEX IF EXISTS "training_calendar_rows_departmentId_topicId_key";
DROP INDEX IF EXISTS "training_calendar_rows_departmentId_idx";
ALTER TABLE "training_calendar_rows" DROP CONSTRAINT IF EXISTS "training_calendar_rows_departmentId_fkey";
ALTER TABLE "training_calendar_rows" DROP COLUMN "departmentId";

-- 4. One row per topic, org-wide (multiple hand-typed rows with NULL topicId
--    are still allowed).
CREATE UNIQUE INDEX "training_calendar_rows_topicId_key" ON "training_calendar_rows"("topicId");
