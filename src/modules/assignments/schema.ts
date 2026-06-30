import { z } from 'zod'

export const createAssignmentSchema = z.object({
  personIds: z
    .array(z.string())
    .min(1, 'At least one person must be selected'),

  topicId: z
    .string()
    .min(1, 'Topic is required'),

  trigger: z.enum(['INDUCTION', 'UPGRADE', 'RETRAINING', 'REFRESHER']),

  dueDate: z
    .string()
    .min(1, 'Due date is required'),
})

export const bulkAssignmentSchema = z.object({
  departmentId: z
    .string()
    .min(1, 'Department is required'),

  topicId: z
    .string()
    .min(1, 'Topic is required'),

  trigger: z.enum(['INDUCTION', 'UPGRADE', 'RETRAINING', 'REFRESHER']),

  dueDate: z
    .string()
    .min(1, 'Due date is required'),
})