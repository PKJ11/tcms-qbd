-- Material upload simplification: drop the "acknowledge everyone / assign
-- the test" version-type choice and the "effective date" field. Assigning
-- training to previously-completed staff is now handled entirely by the
-- separate assign-training flow, not by material upload/approval.

ALTER TABLE "material_versions" DROP COLUMN "versionType";
ALTER TABLE "material_versions" DROP COLUMN "effectiveDate";

DROP TYPE "VersionType";
