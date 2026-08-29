-- CreateTable
CREATE TABLE "training_calendar_rows" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_calendar_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_calendar_marks" (
    "id" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "markedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_calendar_marks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_calendar_rows_departmentId_idx" ON "training_calendar_rows"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "training_calendar_marks_rowId_year_month_key" ON "training_calendar_marks"("rowId", "year", "month");

-- AddForeignKey
ALTER TABLE "training_calendar_rows" ADD CONSTRAINT "training_calendar_rows_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_calendar_rows" ADD CONSTRAINT "training_calendar_rows_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_calendar_marks" ADD CONSTRAINT "training_calendar_marks_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "training_calendar_rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_calendar_marks" ADD CONSTRAINT "training_calendar_marks_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
