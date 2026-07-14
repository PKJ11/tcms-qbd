import { z } from 'zod'

export const createTechniqueSchema = z.object({
  name: z
    .string()
    .min(2,   'Technique name must be at least 2 characters')
    .max(150, 'Technique name too long'),

  code: z
    .string()
    .min(1,  'Code is required')
    .max(20, 'Code too long')
    .regex(/^[A-Z0-9\-]+$/, 'Code must be uppercase letters, numbers, or hyphens'),

  type: z.enum(['METHOD', 'INSTRUMENT', 'TECHNIQUE']),

  departmentId: z
    .string()
    .min(1, 'Department is required'),
})

export const createQualificationSchema = z.object({
  personId: z
    .string()
    .min(1, 'Person is required'),

  techniqueId: z
    .string()
    .min(1, 'Technique is required'),

  performedOn: z
    .string()
    .min(1, 'Performance date is required'),

  supervisorId: z
    .string()
    .min(1, 'Supervisor / Trainer is required'),
})