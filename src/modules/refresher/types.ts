export type RefresherTriggerType = 'PLANNED' | 'DEVIATION' | 'INCIDENT'
export type RefresherStatus      = 'PENDING' | 'COMPLETED' | 'OVERDUE'

export interface RefresherListItem {
  id:            string
  triggerType:   RefresherTriggerType
  status:        RefresherStatus
  justification: string
  dueDate:       Date
  completedAt:   Date | null
  createdAt:     Date
  person: {
    id:         string
    name:       string
    employeeId: string
  }
  topic: {
    id:   string
    name: string
  }
  raisedBy: {
    id:   string
    name: string
  }
  assignment?: {
    id:     string
    status: string
  } | null
}

export interface CreateRefresherInput {
  personIds:   string[]
  topicId:     string
  triggerType: RefresherTriggerType
  dueDate:     string
}

export interface PlannedRefresherInput {
  topicId:           string
  intervalMonths:    number  // e.g. every 12 months
  departmentIds?:    string[]
}