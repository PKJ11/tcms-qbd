import { z } from 'zod'

export const createTopicSchema = z.object({
  name: z
    .string()
    .min(2,   'Topic name must be at least 2 characters')
    .max(150, 'Topic name too long'),

  description: z
    .string()
    .max(500, 'Description too long')
    .optional(),

  departmentIds: z
    .array(z.string())
    .min(1, 'At least one department must be selected'),
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

  departmentIds: z
    .array(z.string())
    .min(1)
    .optional(),

  isActive: z
    .boolean()
    .optional(),
})