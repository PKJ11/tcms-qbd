import { z } from 'zod'

export const createQuestionBankSchema = z.object({
  topicId:      z.string().min(1, 'Topic is required'),
  versionLabel: z.string().min(1, 'Version name is required').max(100),
})

// Returns the field name of the first option that duplicates an earlier one
// (case/whitespace-insensitive), or null if all options are distinct.
export function findDuplicateOption(options: {
  optionA: string
  optionB: string
  optionC: string
  optionD: string
}): 'optionA' | 'optionB' | 'optionC' | 'optionD' | null {
  const entries = (['optionA', 'optionB', 'optionC', 'optionD'] as const).map(
    (field) => [field, options[field].trim().toLowerCase()] as const
  )
  const seen = new Set<string>()
  for (const [field, value] of entries) {
    if (seen.has(value)) return field
    seen.add(value)
  }
  return null
}

export const stageQuestionSchema = z
  .object({
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
  .superRefine((data, ctx) => {
    const duplicateField = findDuplicateOption(data)
    if (duplicateField) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        path:    [duplicateField],
        message: 'Options must all be different',
      })
    }
  })

export const saveVersionSchema = z.object({
  versionLabel: z.string().min(1, 'Version name is required').max(100),
})

export const submitAttemptSchema = z.object({
  assignmentId: z.string().min(1),
  bankId:       z.string().min(1),
  answers:      z.record(z.string(), z.string()),
  startedAt:    z.string().min(1),
})