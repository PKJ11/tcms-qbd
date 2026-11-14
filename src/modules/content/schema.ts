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

  // PowerPoint upload removed (business decision 14-Nov-2026); existing PPT materials stay viewable
  fileType: z.enum(['PDF', 'VIDEO', 'OTHER'], {
    message: 'Invalid file type. Allowed: PDF, Video or Other (DOC/XLS/CSV)',
  }),
})

export const approveMaterialSchema = z.object({
  justification: z
    .string()
    .min(10, 'Justification must be at least 10 characters')
    .max(500, 'Too long'),
})