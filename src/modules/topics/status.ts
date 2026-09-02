import type { TrainingType } from './types'

// ── Content readiness ──────────────────────────────────────────────
// A topic's `isActive` flag is purely an admin on/off switch. Whether a
// topic is actually *ready* to be assigned depends on its training type
// having the content it needs — that's tracked separately here so we
// never touch the admin-controlled isActive semantics.

export type TopicContentStatus = 'ACTIVE' | 'PENDING' | 'INACTIVE'

export interface TopicReadinessInput {
  isActive:      boolean
  trainingType:  TrainingType | string
  materialCount: number
  questionCount: number
}

export function getTopicContentStatus(topic: TopicReadinessInput): TopicContentStatus {
  if (!topic.isActive) return 'INACTIVE'

  switch (topic.trainingType) {
    case 'ACKNOWLEDGEMENT_ONLY':
      return 'ACTIVE'
    case 'MATERIAL_ONLY':
      return topic.materialCount > 0 ? 'ACTIVE' : 'PENDING'
    case 'MATERIAL_MCQ':
    default:
      return topic.materialCount > 0 && topic.questionCount > 0 ? 'ACTIVE' : 'PENDING'
  }
}

export const TOPIC_STATUS_STYLE: Record<TopicContentStatus, { bg: string; color: string; label: string }> = {
  ACTIVE:   { bg: '#f0fdf4', color: '#166534', label: 'Active'  },
  PENDING:  { bg: '#fffbeb', color: '#b45309', label: 'Pending' },
  INACTIVE: { bg: '#fef2f2', color: '#dc2626', label: 'Inactive' },
}

// ── Type-specific workflow copy ────────────────────────────────────
// Drives the guided setup UI on the topic detail page and the
// training-type picker on the create form, so each type is explicit
// about what steps it needs and what it doesn't.

export const TOPIC_TYPE_INFO: Record<TrainingType, {
  label:        string
  shortLabel:   string
  description:  string
  steps:        string[]
}> = {
  MATERIAL_MCQ: {
    label:       'Material + MCQ Assessment',
    shortLabel:  'Material + MCQ',
    description: 'Trainee reads the material, then must pass an MCQ test to complete.',
    steps: [
      'Upload at least one training material',
      'Add at least one assessment question (unlocked once a material exists)',
    ],
  },
  MATERIAL_ONLY: {
    label:       'Material Only',
    shortLabel:  'Material only',
    description: 'Trainee completes as soon as the material has been opened/read. No assessment.',
    steps: [
      'Upload at least one training material',
    ],
  },
  ACKNOWLEDGEMENT_ONLY: {
    label:       'Acknowledgement Only',
    shortLabel:  'Acknowledgement only',
    description: 'Trainee completes by clicking Acknowledge. No material or assessment needed.',
    steps: [
      'Write the "Read & understood" statement in the Description field below — that is what the trainee will read and confirm',
    ],
  },
}
