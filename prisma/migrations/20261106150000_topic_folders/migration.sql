-- Topic folders: purely organisational grouping of training topics.
-- A topic can belong to many folders (topic_folder_items).

-- CreateTable
CREATE TABLE "topic_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_folder_items" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_folder_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "topic_folders_name_key" ON "topic_folders"("name");

-- CreateIndex
CREATE INDEX "topic_folder_items_topicId_idx" ON "topic_folder_items"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "topic_folder_items_folderId_topicId_key" ON "topic_folder_items"("folderId", "topicId");

-- AddForeignKey
ALTER TABLE "topic_folders" ADD CONSTRAINT "topic_folders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_folder_items" ADD CONSTRAINT "topic_folder_items_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "topic_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_folder_items" ADD CONSTRAINT "topic_folder_items_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "training_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Seed the system folders (createdById NULL = created by the system)
INSERT INTO "topic_folders" ("id", "name") VALUES
  ('folder_sys_it',              'IT'),
  ('folder_sys_induction',       'Induction'),
  ('folder_sys_schedule',        'Schedule'),
  ('folder_sys_common_training', 'Common Training')
ON CONFLICT ("name") DO NOTHING;
