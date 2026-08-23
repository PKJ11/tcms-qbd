-- Access grants move from being scoped to a question bank (which may not
-- exist yet) to being scoped to the topic itself, so the same grant can gate
-- both material upload and question management.

CREATE TABLE "topic_collaborators" (
    "id"        TEXT NOT NULL,
    "topicId"   TEXT NOT NULL,
    "personId"  TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_collaborators_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "topic_collaborators_topicId_personId_key" ON "topic_collaborators"("topicId", "personId");

ALTER TABLE "topic_collaborators" ADD CONSTRAINT "topic_collaborators_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "training_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "topic_collaborators" ADD CONSTRAINT "topic_collaborators_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "topic_collaborators" ADD CONSTRAINT "topic_collaborators_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Carry over any existing per-bank grants as topic-level grants.
INSERT INTO "topic_collaborators" ("id", "topicId", "personId", "addedById", "createdAt")
SELECT
  'tc_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20),
  qb."topicId",
  qbc."personId",
  qbc."addedById",
  qbc."createdAt"
FROM "question_bank_collaborators" qbc
JOIN "question_banks" qb ON qb."id" = qbc."bankId"
ON CONFLICT ("topicId", "personId") DO NOTHING;

-- Old per-bank grant table is superseded by topic_collaborators above.
-- DROP TABLE also drops its own constraints/indexes; nothing else references it.
DROP TABLE "question_bank_collaborators";
