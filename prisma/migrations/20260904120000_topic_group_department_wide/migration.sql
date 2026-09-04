-- A Topic Group can now be department-wide: unitId NULL means the group
-- applies to every new joinee of every unit in the department. Whole-unit
-- and section groups keep their unitId. The existing FK
-- (topic_groups_unitId_fkey) already permits NULL, so only the NOT NULL
-- constraint is dropped.
ALTER TABLE "topic_groups" ALTER COLUMN "unitId" DROP NOT NULL;
