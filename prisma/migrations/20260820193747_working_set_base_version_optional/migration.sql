-- Allow a QuestionBankWorkingSet to exist with no base version, so a
-- freshly created QuestionBank can have questions staged before any
-- QuestionBankVersion exists (version 1.0 is only created on first Save).
ALTER TABLE "question_bank_working_sets" ALTER COLUMN "baseVersionId" DROP NOT NULL;
