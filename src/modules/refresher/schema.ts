import { z } from 'zod'

export const createRefresherSchema = z.object({
  personIds: z
    .array(z.string())
    .min(1, 'At least one person must be selected'),

  topicId: z
    .string()
    .min(1, 'Topic is required'),

  triggerType: z.enum(['PLANNED', 'DEVIATION', 'INCIDENT']),

  dueDate: z
    .string()
    .min(1, 'Due date is required'),

  // Justification handled separately at API level (mandatory for ALL triggers,
  // since URS-RFR-002 requires the reason for deviation/incident triggered refreshers,
  // and we apply the same discipline to PLANNED for consistency)
})