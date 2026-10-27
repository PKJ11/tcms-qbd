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
  assignedAt:  Date
  completedAt: Date | null
}

// A trainer picks one topic; the record lists everyone the topic has been
// assigned to so far — with each person's assigned date and, once done,
// their completion date. The digital equivalent of the physical "Training
// Attendance Record" sign-in sheet. For a Trainer/Guest Trainer the list is
// limited to the people they themselves assigned the topic to.
export interface TrainingAttendanceRecord {
  topicId:      string
  topicName:    string
  sopReference: string | null
  date:         string | null // 'YYYY-MM-DD', or null when not filtered by date
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

// ── Training Calendar (physical form QbD/QA/F/007-03) ─────────────
// One organisation-wide free-form list of training titles, each with a tick
// against every month it is planned for in a given year.
export interface TrainingCalendarRowDTO {
  id:     string
  title:  string
  // True when the row mirrors a topic from the Topics list (auto-seeded for
  // every Active/Pending topic) — such rows cannot be renamed or removed
  // from the calendar. False for trainer-typed rows.
  isTopic: boolean
  // 12 booleans, index 0 = January … index 11 = December.
  months: boolean[]
}

export interface TrainingCalendarData {
  year: number
  rows: TrainingCalendarRowDTO[]
}

// ── Training Evaluation Sheet for Objective Questions (form QbD/QA/F/007-05) ──
// A blank-answer evaluation sheet: the chosen topic's objective questions are
// printed with their options, each preceded by a tick box for the trainee to
// mark. Correct answers are deliberately NOT included — it is a test sheet.
export interface EvalObjectiveQuestion {
  questionText: string
  optionA:      string
  optionB:      string
  optionC:      string | null
  optionD:      string | null
}

export interface TrainingEvalObjectiveData {
  topicId:      string
  topicName:    string
  sopReference: string | null
  versionLabel: string | null
  questions:    EvalObjectiveQuestion[]
}

// ── List of SOPs-Self Readout (physical form QbD/QA/F/007-12) ─────
// One row per SOP_SELF_READOUT training assignment. The physical form's
// "Sign/Date of Trainee" column is replaced here by the trainee's name plus
// the completion date — or "N/A" while the readout is still pending.
export interface SopSelfReadoutRow {
  assignmentId: string
  sopNo:        string        // parsed from the topic's SOP reference, else '—'
  title:        string        // topic name
  revisionNo:   string        // parsed from the topic's SOP reference, else '—'
  readOn:       Date | null   // when the readout was completed, else null
  empName:      string        // trainee's name
  employeeId:   string
  completedAt:  Date | null   // null while pending → rendered as "N/A"
}

export interface SopSelfReadoutData {
  rows: SopSelfReadoutRow[]
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
  | 'training-calendar'
  | 'training-eval-objective'
  | 'sop-self-readout'