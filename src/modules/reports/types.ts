export interface TrainingMatrixRow {
  person: {
    id:         string
    name:       string
    employeeId: string
    designation: string
    department: { name: string } | null
    unit:       { name: string }
  }
  topics: {
    topicId:   string
    topicName: string
    status:    'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'OVERDUE' | 'FAILED' | 'NOT_ASSIGNED'
    score?:    number
    completedAt?: Date | null
    dueDate?:  Date | null
  }[]
}

export interface TrainingIndexEntry {
  id:          string
  topicName:   string
  trigger:     string
  status:      string
  assignedAt:  Date
  dueDate:     Date
  startedAt:   Date | null
  completedAt: Date | null
  score?:      number | null
  outcome?:    string | null
  assignedBy:  string
}

export interface OverdueReportRow {
  person: {
    id:         string
    name:       string
    employeeId: string
    department: string | null
    unit:       string
    manager:    string | null
  }
  assignment: {
    id:        string
    topicName: string
    trigger:   string
    dueDate:   Date
    daysOverdue: number
  }
}

export interface QualificationStatusRow {
  person: {
    id:         string
    name:       string
    employeeId: string
    department: string | null
  }
  technique:   string
  status:      string
  outcome:     string | null
  approvedAt:  Date | null
  expiryDate:  Date | null
  daysToExpiry: number | null
  certNumber:  string | null
}

export type ReportType =
  | 'training-matrix'
  | 'training-index'
  | 'overdue'
  | 'qualification-status'
  | 'competency-board'