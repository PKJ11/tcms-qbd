-- ============================================================
-- Question bank versioning + assignment version traceability
--
-- Hand-authored (not `prisma migrate dev`) because the shadow
-- database could not be created in this environment. Statement
-- order matters: new tables and nullable columns are added first,
-- existing rows are backfilled into a v1 snapshot, THEN columns
-- are tightened to NOT NULL and foreign keys are attached.
-- ============================================================

-- 1. New tables --------------------------------------------------

CREATE TABLE "question_bank_versions" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "basedOnVersionId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_bank_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "question_bank_working_sets" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "baseVersionId" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_bank_working_sets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "question_bank_working_set_items" (
    "id" TEXT NOT NULL,
    "workingSetId" TEXT NOT NULL,
    "sourceQuestionId" TEXT,
    "questionText" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "question_bank_working_set_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assignment_material_versions" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "materialVersionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_material_versions_pkey" PRIMARY KEY ("id")
);

-- 2. New columns, nullable for now so they can be backfilled -----

ALTER TABLE "question_banks" ADD COLUMN "currentVersionId" TEXT;
ALTER TABLE "training_assignments" ADD COLUMN "questionBankVersionId" TEXT;
ALTER TABLE "assessment_attempts" ADD COLUMN "bankVersionId" TEXT;
ALTER TABLE "questions" ADD COLUMN "bankVersionId" TEXT;

-- 3. Backfill — one v1 snapshot per existing bank -----------------
-- versionLabel "1.0"; createdById is best-effort: the person who
-- originally created the bank per the audit log, else the earliest
-- Administrator, else the earliest person in the system.

WITH inserted_versions AS (
  INSERT INTO "question_bank_versions" ("id", "bankId", "versionNo", "versionLabel", "basedOnVersionId", "createdById", "createdAt")
  SELECT
    'qbv_' || md5(random()::text || clock_timestamp()::text || qb.id),
    qb.id,
    1,
    '1.0',
    NULL,
    COALESCE(
      (SELECT al."userId" FROM "audit_logs" al WHERE al."recordType" = 'QuestionBank' AND al."recordId" = qb.id AND al."action" = 'CREATE' ORDER BY al."createdAt" ASC LIMIT 1),
      (SELECT p.id FROM "persons" p JOIN "person_roles" pr ON pr."personId" = p.id WHERE pr."role" = 'ADMINISTRATOR' ORDER BY p."createdAt" ASC LIMIT 1),
      (SELECT p.id FROM "persons" p ORDER BY p."createdAt" ASC LIMIT 1)
    ),
    qb."createdAt"
  FROM "question_banks" qb
  RETURNING "id", "bankId"
)
UPDATE "question_banks" qb
SET "currentVersionId" = iv."id"
FROM inserted_versions iv
WHERE qb."id" = iv."bankId";

UPDATE "questions" q
SET "bankVersionId" = qb."currentVersionId"
FROM "question_banks" qb
WHERE q."bankId" = qb."id";

UPDATE "assessment_attempts" aa
SET "bankVersionId" = qb."currentVersionId"
FROM "question_banks" qb
WHERE aa."bankId" = qb."id";

-- 4. Tighten now that every existing row has a version ------------

ALTER TABLE "questions" ALTER COLUMN "bankVersionId" SET NOT NULL;
ALTER TABLE "assessment_attempts" ALTER COLUMN "bankVersionId" SET NOT NULL;

-- 5. Drop the superseded direct bank link on questions -------------

ALTER TABLE "questions" DROP CONSTRAINT "questions_bankId_fkey";
ALTER TABLE "questions" DROP COLUMN "bankId";

-- 6. Indexes --------------------------------------------------------

CREATE UNIQUE INDEX "assignment_material_versions_assignmentId_materialId_key" ON "assignment_material_versions"("assignmentId", "materialId");
CREATE UNIQUE INDEX "question_bank_versions_bankId_versionNo_key" ON "question_bank_versions"("bankId", "versionNo");
CREATE UNIQUE INDEX "question_bank_working_sets_bankId_key" ON "question_bank_working_sets"("bankId");
CREATE UNIQUE INDEX "question_banks_currentVersionId_key" ON "question_banks"("currentVersionId");

-- 7. Foreign keys -----------------------------------------------------

ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_questionBankVersionId_fkey" FOREIGN KEY ("questionBankVersionId") REFERENCES "question_bank_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assignment_material_versions" ADD CONSTRAINT "assignment_material_versions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "training_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignment_material_versions" ADD CONSTRAINT "assignment_material_versions_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "training_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignment_material_versions" ADD CONSTRAINT "assignment_material_versions_materialVersionId_fkey" FOREIGN KEY ("materialVersionId") REFERENCES "material_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "question_banks" ADD CONSTRAINT "question_banks_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "question_bank_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "question_bank_versions" ADD CONSTRAINT "question_bank_versions_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "question_banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "question_bank_versions" ADD CONSTRAINT "question_bank_versions_basedOnVersionId_fkey" FOREIGN KEY ("basedOnVersionId") REFERENCES "question_bank_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "question_bank_versions" ADD CONSTRAINT "question_bank_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "question_bank_working_sets" ADD CONSTRAINT "question_bank_working_sets_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "question_banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "question_bank_working_sets" ADD CONSTRAINT "question_bank_working_sets_baseVersionId_fkey" FOREIGN KEY ("baseVersionId") REFERENCES "question_bank_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "question_bank_working_set_items" ADD CONSTRAINT "question_bank_working_set_items_workingSetId_fkey" FOREIGN KEY ("workingSetId") REFERENCES "question_bank_working_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_bankVersionId_fkey" FOREIGN KEY ("bankVersionId") REFERENCES "question_bank_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_bankVersionId_fkey" FOREIGN KEY ("bankVersionId") REFERENCES "question_bank_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
