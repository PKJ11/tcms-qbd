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

// One department + its optional subset of selected sections.
// sectionIds omitted or empty ⇒ whole department (all persons, including those with no section).
const departmentSelectionSchema = z.object({
  departmentId: z.string().min(1),
  sectionIds:   z.array(z.string()).optional(),
})

export const bulkAssignmentSchema = z.object({
  selections: z
    .array(departmentSelectionSchema)
    .min(1, 'Select at least one department'),

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
export type BulkAssignmentInput   = z.infer<typeof bulkAssignmentSchema>