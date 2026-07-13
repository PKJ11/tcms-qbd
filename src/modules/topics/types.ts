export type TrainingType = 'MATERIAL_MCQ' | 'MATERIAL_ONLY' | 'ACKNOWLEDGEMENT_ONLY'

export interface TopicScopeItem {
  departmentId: string
  unitId?:      string
  sectionId?:   string
}

export interface TopicListItem {
  id:           string
  name:         string
  description:  string | null
  trainingType: TrainingType
  isActive:     boolean
  createdAt:    Date
  createdBy: {
    id:   string
    name: string
  }
  topicScopes: {
    department: { id: string; name: string }
    unit:       { id: string; name: string } | null
    section:    { id: string; name: string } | null
  }[]
  _count: {
    assignments: number
    materials:   number
  }
}

export interface TopicDetail extends TopicListItem {
  questionBank: {
    id:                  string
    passingPercentage:   number
    questionsPerAttempt: number
    maxAttempts:         number
    isActive:            boolean
    _count: {
      questions: number
    }
  } | null
  materials: {
    id:             string
    title:          string
    currentVersion: number
    status:         string
  }[]
}

export interface CreateTopicInput {
  name:          string
  description?:  string
  trainingType?: TrainingType
  scopes:        TopicScopeItem[]
}

export interface UpdateTopicInput {
  name?:         string
  description?:  string
  trainingType?: TrainingType
  scopes?:       TopicScopeItem[]
  isActive?:     boolean
}
