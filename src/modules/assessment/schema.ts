import { z } from 'zod'
import { QUESTIONS_PER_ATTEMPT } from './constants'

// A question can have 2-4 options. A and B are always required; C and D are
// optional — leaving one blank drops the question to fewer options, not an
// error. Converts a blank string to null so "not filled" is represented
// consistently everywhere (DB, API, UI).
export function normalizeOption(value?: string | null): string | null {
  return value && value.trim() ? value.trim() : null
}

// Returns the field name of the first option that duplicates an earlier one
// (case/whitespace-insensitive), or null if all options are distinct. Blank
// (unfilled) options are skipped — only options that are actually present
// can collide.
export function findDuplicateOption(options: {
  optionA: string
  optionB: string
  optionC?: string | null
  optionD?: string | null
}): 'optionA' | 'optionB' | 'optionC' | 'optionD' | null {
  const entries = (['optionA', 'optionB', 'optionC', 'optionD'] as const)
    .map((field) => [field, options[field]] as const)
    .filter((entry): entry is [typeof entry[0], string] => !!entry[1]?.trim())
    .map(([field, value]) => [field, value.trim().toLowerCase()] as const)

  const seen = new Set<string>()
  for (const [field, value] of entries) {
    if (seen.has(value)) return field
    seen.add(value)
  }
  return null
}

export const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const
export type OptionLetter = typeof OPTION_LETTERS[number]

// The options an attempt-taker or reviewer should actually see — only the
// filled ones (2-4 of the 4 possible slots), in order.
export function filledOptions(q: {
  optionA: string
  optionB: string
  optionC?: string | null
  optionD?: string | null
}): { letter: OptionLetter; text: string }[] {
  const all: [OptionLetter, string | null | undefined][] = [
    ['A', q.optionA], ['B', q.optionB], ['C', q.optionC], ['D', q.optionD],
  ]
  return all
    .filter((entry): entry is [OptionLetter, string] => !!entry[1]?.trim())
    .map(([letter, text]) => ({ letter, text }))
}

// Client-side mirror of the stageQuestionSchema option rules, for instant
// form feedback before hitting the API. Returns a human-readable error, or
// null if the option set is valid.
export function validateOptionSet(q: {
  optionA: string
  optionB: string
  optionC?: string | null
  optionD?: string | null
  correctAnswer: OptionLetter
}): string | null {
  if (!q.optionA.trim() || !q.optionB.trim()) {
    return 'Option A and Option B are required.'
  }
  if (q.optionD?.trim() && !q.optionC?.trim()) {
    return 'Fill Option C before Option D, or clear Option D too.'
  }
  if (q.correctAnswer === 'C' && !q.optionC?.trim()) {
    return 'Correct answer is set to Option C, but Option C is empty.'
  }
  if (q.correctAnswer === 'D' && !q.optionD?.trim()) {
    return 'Correct answer is set to Option D, but Option D is empty.'
  }
  if (findDuplicateOption(q)) {
    return 'Options must all be different.'
  }
  return null
}

export const stageQuestionSchema = z
  .object({
    questionText: z
      .string()
      .min(5,   'Question must be at least 5 characters')
      .max(1000, 'Question too long'),

    optionA: z.string().min(1, 'Option A is required').max(300, 'Option A too long'),
    optionB: z.string().min(1, 'Option B is required').max(300, 'Option B too long'),
    optionC: z.string().max(300, 'Option C too long').nullable().optional()
      .transform(normalizeOption),
    optionD: z.string().max(300, 'Option D too long').nullable().optional()
      .transform(normalizeOption),

    correctAnswer: z.enum(['A', 'B', 'C', 'D']),
  })
  .superRefine((data, ctx) => {
    if (data.optionD && !data.optionC) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        path:    ['optionC'],
        message: 'Fill Option C before Option D, or clear Option D too',
      })
    }
    if (data.correctAnswer === 'C' && !data.optionC) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        path:    ['correctAnswer'],
        message: 'Correct answer is set to Option C, but Option C is empty',
      })
    }
    if (data.correctAnswer === 'D' && !data.optionD) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        path:    ['correctAnswer'],
        message: 'Correct answer is set to Option D, but Option D is empty',
      })
    }

    const duplicateField = findDuplicateOption(data)
    if (duplicateField) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        path:    [duplicateField],
        message: 'Options must all be different',
      })
    }
  })

// A brand-new bank is never created empty — it's created together with its
// first version, which must already have enough active questions to fill a
// full attempt (SOP-fixed at QUESTIONS_PER_ATTEMPT).
export const createQuestionBankSchema = z.object({
  topicId:   z.string().min(1, 'Topic is required'),
  questions: z.array(stageQuestionSchema).min(
    QUESTIONS_PER_ATTEMPT,
    `Add at least ${QUESTIONS_PER_ATTEMPT} questions before saving`
  ),
})

export const submitAttemptSchema = z.object({
  assignmentId: z.string().min(1),
  bankId:       z.string().min(1),
  answers:      z.record(z.string(), z.string()),
  startedAt:    z.string().min(1),
})