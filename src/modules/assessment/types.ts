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
  questions: QuestionItem[]
  _count: {
    questions: number
  }
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
  topicId:             string
  passingPercentage:   number
  questionsPerAttempt: number
  maxAttempts:         number
}

export interface CreateQuestionInput {
  bankId:        string
  questionText:  string
  optionA:       string
  optionB:       string
  optionC:       string
  optionD:       string
  correctAnswer: 'A' | 'B' | 'C' | 'D'
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