import { z } from 'zod'

const scopeSchema = z.object({
  departmentId: z.string().min(1),
  unitId:       z.string().optional(),
  sectionId:    z.string().optional(),
})

export const trainingTypeSchema = z.enum([
  'MATERIAL_MCQ', 'MATERIAL_ONLY', 'ACKNOWLEDGEMENT_ONLY',
])

export const createTopicSchema = z.object({
  name: z
    .string()
    .min(2,   'Topic name must be at least 2 characters')
    .max(150, 'Topic name too long'),

  description: z
    .string()
    .max(500, 'Description too long')
    .optional(),

  // e.g. "QbD-QC-SOP-067, Ver.No. 04" — shown under the topic name on the
  // Training Matrix report. Optional since not every topic maps to one SOP.
  sopReference: z
    .string()
    .max(150, 'SOP reference too long')
    .optional(),

  trainingType: trainingTypeSchema.default('MATERIAL_MCQ'),

  // Optional — a topic doesn't have to be compulsory for anyone. When scopes
  // ARE given, matching new joiners are auto-assigned this training.
  scopes: z
    .array(scopeSchema)
    .default([]),
})
  // Acknowledgement-only training has no material or assessment — the
  // description IS the statement trainees read and confirm they understood,
  // so it can't be left blank for this type.
  .superRefine((data, ctx) => {
    if (data.trainingType === 'ACKNOWLEDGEMENT_ONLY' && !data.description?.trim()) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        path:    ['description'],
        message: 'Description is required for acknowledgement-only training — write the statement trainees must read and understand.',
      })
    }
  })

export const updateTopicSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(150)
    .optional(),

  description: z
    .string()
    .max(500)
    .optional(),

  sopReference: z
    .string()
    .max(150)
    .optional(),

  trainingType: trainingTypeSchema.optional(),

  scopes: z
    .array(scopeSchema)
    .optional(),

  isActive: z
    .boolean()
    .optional(),
})
