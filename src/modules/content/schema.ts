import { z } from 'zod'

export const createMaterialSchema = z.object({
  title: z
    .string()
    .min(2,   'Title must be at least 2 characters')
    .max(200, 'Title too long'),

  topicId: z
    .string()
    .min(1, 'Topic is required'),

  changeSummary: z
    .string()
    .min(5,   'Change summary must be at least 5 characters')
    .max(500, 'Change summary too long'),

  effectiveDate: z
    .string()
    .min(1, 'Effective date is required'),

  versionType: z.enum(['MAJOR', 'MINOR']),

  fileType: z.enum(['PPT', 'PDF', 'VIDEO', 'OTHER']),
})

export const approveMaterialSchema = z.object({
  justification: z
    .string()
    .min(10, 'Justification must be at least 10 characters')
    .max(500, 'Too long'),
})