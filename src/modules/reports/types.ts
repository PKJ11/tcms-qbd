export interface TrainingMatrixRow {
  person: {
    id:         string
    name:       string
    employeeId: string
    designation: string
    department: { name: string } | null
    section: { name: string } | null
  }
  topics: {
    topicId:   string
    topicName: string
    status:    'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'OVERDUE' | 'FAILED' | 'NOT_ASSIGNED'
    score?:    number
    assignedAt?: Date | null
    completedAt?: Date | null
    dueDate?:  Date | null
    assignedBy?: string | null
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
    section: string | null
    manager:    string | null
  }
  assignment: {
    id:        string
    topicName: string
    trigger:   string
    assignedAt: Date
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

export interface TopicCompletionReport {
  topicId:     string
  topicName:   string
  trainerName: string
  trainees: {
    personId:    string
    name:        string
    employeeId:  string
    status:      string
    assignedAt:  Date
    dueDate:     Date
    completedAt: Date | null
    assignedBy:  string
  }[]
}

export interface AttendanceChartBucket {
  month:       string  // '2026-01'
  monthLabel:  string  // 'Jan 2026'
  attended:    number
  notAttended: number
}

export type ReportType =
  | 'training-matrix'
  | 'training-index'
  | 'overdue'
  | 'qualification-status'
  | 'competency-board'
  | 'topic-completion'
  | 'attendance-chart'