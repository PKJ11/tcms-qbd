-- CreateTable
CREATE TABLE "topic_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_group_items" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_group_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "topic_group_items_groupId_topicId_key" ON "topic_group_items"("groupId", "topicId");

-- AddForeignKey
ALTER TABLE "topic_groups" ADD CONSTRAINT "topic_groups_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_groups" ADD CONSTRAINT "topic_groups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_group_items" ADD CONSTRAINT "topic_group_items_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "topic_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_group_items" ADD CONSTRAINT "topic_group_items_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "training_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
