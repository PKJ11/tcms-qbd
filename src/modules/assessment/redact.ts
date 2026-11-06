// Strip a question bank down to what a non-author may see: its settings, with
// no questions and therefore no correct answers. Kept out of actions.ts because
// that is a 'use server' module (every export there becomes a server action).

type BankWithQuestions = {
  id:                  string
  topicId:             string
  passingPercentage:   number
  questionsPerAttempt: number
  maxAttempts:         number
  isActive:            boolean
  topic:               { id: string; name: string }
  currentVersionId:    string | null
  currentVersion:      { id: string; versionNo: number; versionLabel: string } | null
}

export function redactBankForViewer(bank: BankWithQuestions | null) {
  if (!bank) return null
  return {
    id:                  bank.id,
    topicId:             bank.topicId,
    passingPercentage:   bank.passingPercentage,
    questionsPerAttempt: bank.questionsPerAttempt,
    maxAttempts:         bank.maxAttempts,
    isActive:            bank.isActive,
    topic:               bank.topic,
    currentVersionId:    bank.currentVersionId,
    currentVersion:      bank.currentVersion
      ? {
          id:           bank.currentVersion.id,
          versionNo:    bank.currentVersion.versionNo,
          versionLabel: bank.currentVersion.versionLabel,
        }
      : null,
  }
}
