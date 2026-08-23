-- Options C and D become optional so a question can have 2-4 options instead of always 4.
ALTER TABLE "question_bank_working_set_items" ALTER COLUMN "optionC" DROP NOT NULL;
ALTER TABLE "question_bank_working_set_items" ALTER COLUMN "optionD" DROP NOT NULL;
ALTER TABLE "questions" ALTER COLUMN "optionC" DROP NOT NULL;
ALTER TABLE "questions" ALTER COLUMN "optionD" DROP NOT NULL;
