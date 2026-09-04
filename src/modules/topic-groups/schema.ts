import { z } from 'zod'

// departmentId is deliberately NOT accepted here — a topic group is always
// scoped server-side to the creating trainer's own department. unitId and
// sectionId are client-supplied and validated against that department:
//   - unitId null            -> department-wide group
//   - unitId set, no section  -> whole-unit group
//   - unitId + sectionId set  -> one section of that unit
export const createTopicGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Group name must be at least 3 characters')
    .max(120, 'Group name is too long'),

  unitId: z
    .string()
    .nullable()
    .optional(),

  sectionId: z
    .string()
    .nullable()
    .optional(),

  topicIds: z
    .array(z.string())
    .min(1, 'At least one topic must be added to the group'),
})

export type CreateTopicGroupInput = z.infer<typeof createTopicGroupSchema>

export const updateTopicGroupTopicsSchema = z.object({
  topicIds: z.array(z.string()),
})

export type UpdateTopicGroupTopicsInput = z.infer<typeof updateTopicGroupTopicsSchema>
