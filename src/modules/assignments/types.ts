export type AssignmentStatus  = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'FAILED'
export type TrainingTrigger   = 'INDUCTION' | 'UPGRADE' | 'RETRAINING' | 'REFRESHER'

export interface AssignmentListItem {
  id:           string
  trigger:      TrainingTrigger
  status:       AssignmentStatus
  dueDate:      Date
  startedAt:    Date | null
  completedAt:  Date | null
  acknowledged: boolean
  createdAt:    Date
  person: {
    id:   string
    name: string
    employeeId: string
  }
  topic: {
    id:   string
    name: string
  }
  assignedBy: {
    id:   string
    name: string
  }
}

export interface MyAssignment extends AssignmentListItem {
  topic: {
    id:          string
    name:        string
    description: string | null
    materials: {
      id:             string
      title:          string
      currentVersion: number
      versions: {
        id:           string
        versionLabel: string
        versionType:  string
        fileType:     string
        status:       string
      }[]
    }[]
  }
}

export interface CreateAssignmentInput {
  personIds: string[]   // can be 1 or many — bulk assignment
  topicId:   string
  trigger:   TrainingTrigger
  dueDate:   string
  needIdentifiedById?: string | null
  needBasis?: string | null
}

export interface DepartmentSectionSelection {
  departmentId: string
  sectionIds?:  string[]   // optional subset of that department's sections; empty/undefined = whole department
}

export interface BulkAssignmentInput {
  selections:          DepartmentSectionSelection[]
  topicId:             string
  trigger:             TrainingTrigger
  dueDate:             string
  needIdentifiedById?: string | null
  needBasis?:          string | null
}