import { z } from 'zod'

export const createQuestionBankSchema = z.object({
  topicId: z.string().min(1, 'Topic is required'),
})

export const createQuestionSchema = z.object({
  bankId: z.string().min(1),

  questionText: z
    .string()
    .min(5,   'Question must be at least 5 characters')
    .max(1000, 'Question too long'),

  optionA: z.string().min(1, 'Option A is required').max(300),
  optionB: z.string().min(1, 'Option B is required').max(300),
  optionC: z.string().min(1, 'Option C is required').max(300),
  optionD: z.string().min(1, 'Option D is required').max(300),

  correctAnswer: z.enum(['A', 'B', 'C', 'D']),
})

export const submitAttemptSchema = z.object({
  assignmentId: z.string().min(1),
  bankId:       z.string().min(1),
  answers:      z.record(z.string(), z.string()),
  startedAt:    z.string().min(1),
})