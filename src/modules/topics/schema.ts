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

  trainingType: trainingTypeSchema.default('MATERIAL_MCQ'),

  // Optional — a topic doesn't have to be compulsory for anyone. When scopes
  // ARE given, matching new joiners are auto-assigned this training.
  scopes: z
    .array(scopeSchema)
    .default([]),
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

  trainingType: trainingTypeSchema.optional(),

  scopes: z
    .array(scopeSchema)
    .optional(),

  isActive: z
    .boolean()
    .optional(),
})
