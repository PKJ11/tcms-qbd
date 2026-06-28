import type { AuditAction } from '@prisma/client'

export type { AuditAction }

export interface AuditEventPayload {
  userId:       string        // who performed the action
  action:       AuditAction   // CREATE | UPDATE | DELETE | LOGIN | etc.
  module:       string        // e.g. "PERSONNEL", "ASSESSMENT"
  recordId:     string        // id of the affected record
  recordType:   string        // e.g. "Person", "TrainingAssignment"
  beforeValue?: object | null // snapshot before change
  afterValue?:  object | null // snapshot after change
  justification: string       // mandatory — why this was done
  ipAddress?:   string
  userAgent?:   string
}

export interface AuditLogEntry {
  id:            string
  userId:        string
  userName:      string
  userEmail:     string
  action:        AuditAction
  module:        string
  recordId:      string
  recordType:    string
  beforeValue:   object | null
  afterValue:    object | null
  justification: string
  ipAddress:     string | null
  userAgent:     string | null
  createdAt:     Date
}

export type AuditModule =
  | 'PERSONNEL'
  | 'TRAINING_TOPIC'
  | 'TRAINING_ASSIGNMENT'
  | 'CONTENT'
  | 'ASSESSMENT'
  | 'QUALIFICATION'
  | 'REFRESHER'
  | 'NOTIFICATION'
  | 'AUTH'
  | 'ADMIN'
  | 'SYSTEM'