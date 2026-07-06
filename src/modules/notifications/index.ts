export {
  sendNotification,
  sendBulkNotifications,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  scanAndNotifyOverdue,
} from './service'

export type {
  NotificationItem,
  NotificationSummary,
  SendNotificationInput,
  NotificationType,
} from './types'