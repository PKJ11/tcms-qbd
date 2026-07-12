-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('ADMINISTRATOR', 'VIEWER', 'TRAINER', 'TRAINEE', 'GUEST_TRAINER', 'CONTRACTUAL_EMPLOYEE');

-- CreateEnum
CREATE TYPE "TrainingTrigger" AS ENUM ('INDUCTION', 'UPGRADE', 'RETRAINING', 'REFRESHER', 'TECHNICAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'FAILED');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'APPROVED', 'RETIRED');

-- CreateEnum
CREATE TYPE "VersionType" AS ENUM ('MAJOR', 'MINOR');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('PPT', 'PDF', 'VIDEO', 'OTHER');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('MCQ', 'ORAL');

-- CreateEnum
CREATE TYPE "AssessmentOutcome" AS ENUM ('PASS', 'FAIL', 'NEEDS_RETRAINING');

-- CreateEnum
CREATE TYPE "QualStatus" AS ENUM ('INITIATED', 'IN_PROGRESS', 'APPROVED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "QualOutcome" AS ENUM ('COMPETENT', 'NOT_YET_COMPETENT');

-- CreateEnum
CREATE TYPE "TechniqueType" AS ENUM ('METHOD', 'INSTRUMENT', 'TECHNIQUE');

-- CreateEnum
CREATE TYPE "SignatoryRole" AS ENUM ('TRAINER', 'QA', 'QA_MANAGER', 'TRAINING_HEAD');

-- CreateEnum
CREATE TYPE "SignatoryStatus" AS ENUM ('PENDING', 'SIGNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ASSIGNMENT', 'DUE_SOON', 'OVERDUE', 'FAILED', 'RETRAINING', 'QUALIFICATION_EXPIRY', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'UPLOAD', 'GENERATE', 'ASSIGN', 'REVOKE');

-- CreateEnum
CREATE TYPE "RefresherTriggerType" AS ENUM ('PLANNED', 'DEVIATION', 'INCIDENT');

-- CreateEnum
CREATE TYPE "RefresherStatus" AS ENUM ('PENDING', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "TestPhase" AS ENUM ('IQ', 'OQ', 'PQ', 'RT');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('NOT_EXECUTED', 'PASS', 'FAIL', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETE', 'LOCKED');

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_roles" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "AppRole" NOT NULL,

    CONSTRAINT "person_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "designation" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "departmentId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "sectionId" TEXT,
    "managerId" TEXT,
    "flaggedForJobReassignment" BOOLEAN NOT NULL DEFAULT false,
    "flaggedAt" TIMESTAMP(3),
    "flagReason" TEXT,
    "flagTopicId" TEXT,
    "flagCycleCount" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolutionAction" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_topics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_departments" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_materials" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_certificates" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "certNumber" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokedReason" TEXT,

    CONSTRAINT "trainer_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_versions" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "versionType" "VersionType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" "FileType" NOT NULL,
    "changeSummary" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "uploadedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_assignments" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "trigger" "TrainingTrigger" NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "assignedById" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "needIdentifiedById" TEXT,
    "needBasis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_banks" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "passingPercentage" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "questionsPerAttempt" INTEGER NOT NULL DEFAULT 10,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assessmentType" "AssessmentType" NOT NULL DEFAULT 'MCQ',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_attempts" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "attemptNo" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "outcome" "AssessmentOutcome" NOT NULL,
    "answers" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresher_triggers" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "triggerType" "RefresherTriggerType" NOT NULL,
    "status" "RefresherStatus" NOT NULL DEFAULT 'PENDING',
    "justification" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresher_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "techniques" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "TechniqueType" NOT NULL,
    "departmentId" TEXT NOT NULL,
    "qualificationPeriodDays" INTEGER NOT NULL DEFAULT 365,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "techniques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualification_records" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "techniqueId" TEXT NOT NULL,
    "status" "QualStatus" NOT NULL DEFAULT 'INITIATED',
    "outcome" "QualOutcome",
    "performedOn" TIMESTAMP(3),
    "supervisorId" TEXT,
    "initiatedById" TEXT NOT NULL,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "requalificationOf" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualification_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signatory_entries" (
    "id" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "requiredRole" "SignatoryRole" NOT NULL,
    "signedById" TEXT,
    "signedAt" TIMESTAMP(3),
    "justification" TEXT,
    "status" "SignatoryStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signatory_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scanned_documents" (
    "id" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scanned_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "certNumber" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileUrl" TEXT NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "module" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "beforeValue" JSONB,
    "afterValue" JSONB,
    "justification" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_runs" (
    "id" TEXT NOT NULL,
    "phase" "TestPhase" NOT NULL,
    "version" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "status" "ValidationStatus" NOT NULL DEFAULT 'PLANNED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "executedById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_cases" (
    "id" TEXT NOT NULL,
    "ursId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "phase" "TestPhase" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'M',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_results" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "status" "TestStatus" NOT NULL DEFAULT 'NOT_EXECUTED',
    "actualResult" TEXT,
    "defectNotes" TEXT,
    "executedById" TEXT,
    "executedAt" TIMESTAMP(3),
    "screenshotUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "units_departmentId_code_key" ON "units"("departmentId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "sections_unitId_code_key" ON "sections"("unitId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "person_roles_personId_role_key" ON "person_roles"("personId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "persons_employeeId_key" ON "persons"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "persons_email_key" ON "persons"("email");

-- CreateIndex
CREATE UNIQUE INDEX "topic_departments_topicId_departmentId_key" ON "topic_departments"("topicId", "departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_certificates_certNumber_key" ON "trainer_certificates"("certNumber");

-- CreateIndex
CREATE UNIQUE INDEX "material_versions_materialId_versionNo_key" ON "material_versions"("materialId", "versionNo");

-- CreateIndex
CREATE UNIQUE INDEX "question_banks_topicId_key" ON "question_banks"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "techniques_code_key" ON "techniques"("code");

-- CreateIndex
CREATE UNIQUE INDEX "signatory_entries_qualificationId_stepOrder_key" ON "signatory_entries"("qualificationId", "stepOrder");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certNumber_key" ON "certificates"("certNumber");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_qualificationId_key" ON "certificates"("qualificationId");

-- CreateIndex
CREATE UNIQUE INDEX "test_results_runId_testCaseId_key" ON "test_results"("runId", "testCaseId");

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_roles" ADD CONSTRAINT "person_roles_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_topics" ADD CONSTRAINT "training_topics_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_departments" ADD CONSTRAINT "topic_departments_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "training_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_departments" ADD CONSTRAINT "topic_departments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_materials" ADD CONSTRAINT "training_materials_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "training_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_certificates" ADD CONSTRAINT "trainer_certificates_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_certificates" ADD CONSTRAINT "trainer_certificates_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_certificates" ADD CONSTRAINT "trainer_certificates_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_versions" ADD CONSTRAINT "material_versions_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "training_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_versions" ADD CONSTRAINT "material_versions_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_versions" ADD CONSTRAINT "material_versions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "training_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_banks" ADD CONSTRAINT "question_banks_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "training_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "question_banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "question_banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "training_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresher_triggers" ADD CONSTRAINT "refresher_triggers_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresher_triggers" ADD CONSTRAINT "refresher_triggers_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "training_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresher_triggers" ADD CONSTRAINT "refresher_triggers_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "techniques" ADD CONSTRAINT "techniques_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_records" ADD CONSTRAINT "qualification_records_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_records" ADD CONSTRAINT "qualification_records_techniqueId_fkey" FOREIGN KEY ("techniqueId") REFERENCES "techniques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_records" ADD CONSTRAINT "qualification_records_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_records" ADD CONSTRAINT "qualification_records_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_records" ADD CONSTRAINT "qualification_records_requalificationOf_fkey" FOREIGN KEY ("requalificationOf") REFERENCES "qualification_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatory_entries" ADD CONSTRAINT "signatory_entries_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "qualification_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatory_entries" ADD CONSTRAINT "signatory_entries_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scanned_documents" ADD CONSTRAINT "scanned_documents_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "qualification_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scanned_documents" ADD CONSTRAINT "scanned_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "qualification_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_runs" ADD CONSTRAINT "validation_runs_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_runs" ADD CONSTRAINT "validation_runs_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_runId_fkey" FOREIGN KEY ("runId") REFERENCES "validation_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "test_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

