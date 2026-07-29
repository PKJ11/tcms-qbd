export type AssessmentOutcome = 'PASS' | 'FAIL' | 'NEEDS_RETRAINING'

export interface QuestionBankDetail {
  id:                  string
  topicId:             string
  passingPercentage:   number
  questionsPerAttempt: number
  maxAttempts:         number
  isActive:            boolean
  topic: {
    id:   string
    name: string
  }
  currentVersionId: string | null
  currentVersion: {
    id:           string
    versionNo:    number
    versionLabel: string
    createdAt:    Date
    createdBy:    { id: string; name: string }
    questions:    QuestionItem[]
  } | null
}

export interface QuestionItem {
  id:            string
  questionText:  string
  optionA:       string
  optionB:       string
  optionC:       string
  optionD:       string
  correctAnswer: string
  isActive:      boolean
}

export interface QuestionItemSafe {
  id:           string
  questionText: string
  optionA:      string
  optionB:      string
  optionC:      string
  optionD:      string
  // correctAnswer deliberately omitted — never sent to client during attempt
}

export interface CreateQuestionBankInput {
  topicId:      string
  versionLabel: string
}

export interface StageQuestionInput {
  questionText:  string
  optionA:       string
  optionB:       string
  optionC:       string
  optionD:       string
  correctAnswer: 'A' | 'B' | 'C' | 'D'
}

export interface WorkingSetItem {
  id:               string
  sourceQuestionId: string | null
  questionText:     string
  optionA:          string
  optionB:          string
  optionC:          string
  optionD:          string
  correctAnswer:    string
  isActive:         boolean
}

export interface VersionDiffSummary {
  added:    number
  archived: number
  restored: number
  edited:   number
}

export interface SubmitAttemptInput {
  assignmentId: string
  bankId:       string
  answers:      Record<string, string>  // { questionId: "A" }
  startedAt:    string
}

export interface AttemptResult {
  attemptId:   string
  score:       number
  outcome:     AssessmentOutcome
  attemptNo:   number
  maxAttempts: number
  correctCount: number
  totalCount:   number
}