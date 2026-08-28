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
    topicId:      string
    topicName:    string
    sopReference: string | null
    status:       'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'OVERDUE' | 'FAILED' | 'NOT_ASSIGNED'
    score?:       number
    assignedAt?:  Date | null
    completedAt?: Date | null
    dueDate?:     Date | null
    assignedBy?:  string | null
    // Only meaningful when status is NOT_ASSIGNED — true if this person has
    // no assignment of their own for the topic because they're the one who
    // assigned it to others in this scope/period (the Matrix PDF prints
    // "Trainer" for these cells instead of "N/A").
    isTrainer?:   boolean
  }[]
}

export interface TrainingIndexEntry {
  id:              string
  topicName:       string
  topicDescription: string | null
  trigger:         string
  status:          string
  assignedAt:      Date
  dueDate:         Date
  startedAt:       Date | null
  completedAt:     Date | null
  score?:          number | null
  outcome?:        string | null
  assignedBy:      string
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
    questionBankVersionLabel: string | null
    materialVersionLabels:    string[]
  }[]
}

export interface TrainingAttendanceRow {
  personId:    string
  name:        string
  employeeId:  string
  department:  string | null
  completedAt: Date
}

// A trainer picks one topic + one calendar date; the record lists everyone
// who completed that topic on that day — the digital equivalent of the
// physical "Training Attendance Record" sign-in sheet.
export interface TrainingAttendanceRecord {
  topicId:      string
  topicName:    string
  sopReference: string | null
  date:         string // 'YYYY-MM-DD'
  trainerName:  string | null
  attendees:    TrainingAttendanceRow[]
}

// Org-wide directory of every active Trainer/Guest Trainer — not scoped by
// team, since the list itself IS the org's set of trainers.
export interface TrainerListItem {
  id:          string
  name:        string
  employeeId:  string
  designation: string
  roles:       string[]
  department:  string | null
  unit:        string | null
  section:     string | null
}

export type ReportType =
  | 'training-matrix'
  | 'training-index'
  | 'overdue'
  | 'qualification-status'
  | 'competency-board'
  | 'topic-completion'
  | 'training-attendance'
  | 'trainers-list'