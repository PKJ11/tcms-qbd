import { z } from 'zod'

const TRIGGER_ENUM = z.enum([
  'INDUCTION',
  'UPGRADE',
  'RETRAINING',
  'REFRESHER',
  'TECHNICAL',
  'EXTERNAL',
])

export const createAssignmentSchema = z.object({
  personIds: z
    .array(z.string())
    .min(1, 'At least one person must be selected'),

  topicId: z
    .string()
    .min(1, 'Topic is required'),

  trigger: TRIGGER_ENUM,

  dueDate: z
    .string()
    .min(1, 'Due date is required'),

  needIdentifiedById: z.string().optional().nullable(),
  needBasis: z.string().optional().nullable(),
})

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>