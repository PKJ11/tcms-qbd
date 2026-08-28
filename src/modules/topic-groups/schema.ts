import { z } from 'zod'

// departmentId/unitId are deliberately NOT accepted here — a topic group is
// always scoped server-side to the creating trainer's own department+unit
// ("their team"). Only the optional section narrowing is client-supplied.
export const createTopicGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Group name must be at least 3 characters')
    .max(120, 'Group name is too long'),

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
