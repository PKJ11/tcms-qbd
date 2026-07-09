export interface TopicListItem {
  id:          string
  name:        string
  description: string | null
  isActive:    boolean
  createdAt:   Date
  createdBy: {
    id:   string
    name: string
  }
  departments: {
    department: {
      id:   string
      name: string
      
    }
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
  departmentIds: string[]
}

export interface UpdateTopicInput {
  name?:         string
  description?:  string
  departmentIds?: string[]
  isActive?:     boolean
}