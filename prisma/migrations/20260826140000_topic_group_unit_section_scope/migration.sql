-- Topic Groups now scope to a trainer's own unit ("their team"), with an
-- optional section for extra/section-specific training layered on top of
-- unit-wide groups.
ALTER TABLE "topic_groups" ADD COLUMN "unitId" TEXT;
ALTER TABLE "topic_groups" ADD COLUMN "sectionId" TEXT;

-- Backfill existing rows from their creator's own unit, since every group
-- so far was created by a trainer for their own department.
UPDATE "topic_groups" tg
SET "unitId" = p."unitId"
FROM "persons" p
WHERE tg."createdById" = p."id" AND tg."unitId" IS NULL;

ALTER TABLE "topic_groups" ALTER COLUMN "unitId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "topic_groups" ADD CONSTRAINT "topic_groups_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_groups" ADD CONSTRAINT "topic_groups_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
