export type NotificationType =
  | 'ASSIGNMENT'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'FAILED'
  | 'RETRAINING'
  | 'QUALIFICATION_EXPIRY'
  | 'PASSWORD_RESET'
  | 'DOCUMENT_UPDATED'

export type NotificationChannel = 'IN_APP' | 'EMAIL'

export interface NotificationItem {
  id:        string
  type:      NotificationType
  channel:   NotificationChannel
  title:     string
  message:   string
  isRead:    boolean
  sentAt:    Date
  readAt:    Date | null
}

export interface NotificationSummary {
  total:       number
  unreadCount: number
  items:       NotificationItem[]
}

export interface SendNotificationInput {
  personId:  string
  type:      NotificationType
  title:     string
  message:   string
  sendEmail?: boolean
  email?:    string
}