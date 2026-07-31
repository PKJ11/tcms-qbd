-- ============================================================
-- Question bank collaborators: lets the trainer who created a
-- training topic grant other trainers permission to edit that
-- topic's question bank (add/edit/archive questions, save versions).
--
-- Hand-authored (not `prisma migrate dev`) because the shadow
-- database could not be created in this environment.
-- ============================================================

CREATE TABLE "question_bank_collaborators" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_bank_collaborators_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "question_bank_collaborators_bankId_personId_key" ON "question_bank_collaborators"("bankId", "personId");

ALTER TABLE "question_bank_collaborators" ADD CONSTRAINT "question_bank_collaborators_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "question_banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "question_bank_collaborators" ADD CONSTRAINT "question_bank_collaborators_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "question_bank_collaborators" ADD CONSTRAINT "question_bank_collaborators_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
