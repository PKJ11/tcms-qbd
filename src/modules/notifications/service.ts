import { prisma }      from '@/lib/prisma'
import { sendEmail }   from '@/lib/email'
import type { SendNotificationInput, NotificationType } from './types'

// ── Email templates per notification type ─────────────────────────

const EMAIL_SUBJECTS: Record<NotificationType, string> = {
  ASSIGNMENT:           'New training assigned — TCMS',
  DUE_SOON:            'Training due soon — TCMS',
  OVERDUE:             'Training overdue — TCMS',
  FAILED:              'Assessment not passed — TCMS',
  RETRAINING:          'Retraining required — TCMS',
  QUALIFICATION_EXPIRY: 'Qualification expiring — TCMS',
  PASSWORD_RESET:       'Your TCMS password has been reset',
}

function buildEmailHtml(title: string, message: string, personName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f4f6f8;font-family:sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 20px">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">

              <!-- Header -->
              <tr>
                <td style="background:#1a3a2a;padding:24px 32px">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <div style="display:inline-flex;align-items:center;gap:8px">
                          <div style="background:#2d6a4f;width:32px;height:32px;border-radius:8px;display:inline-block;text-align:center;line-height:32px;color:#fff;font-weight:700;font-size:12px">
                            QbD
                          </div>
                          <span style="color:#fff;font-weight:600;font-size:15px;margin-left:8px">TCMS</span>
                        </div>
                        <div style="color:#74c69d;font-size:11px;margin-top:2px;margin-left:40px">
                          Training &amp; Competency Management System
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px">
                  <p style="color:#6b7280;font-size:14px;margin:0 0 8px">
                    Dear ${personName},
                  </p>
                  <h2 style="color:#111827;font-size:20px;margin:0 0 16px;font-weight:600">
                    ${title}
                  </h2>
                  <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px">
                    ${message}
                  </p>

                  <!-- CTA Button -->
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:#2d6a4f;border-radius:8px;padding:12px 24px">
                        
                          href="${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}"
                          style="color:#fff;text-decoration:none;font-size:14px;font-weight:600"
                        >
                          Open TCMS →
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
                  <p style="color:#9ca3af;font-size:12px;margin:0">
                    This is an automated notification from TCMS.
                    Every action in this system is recorded in a tamper-evident audit trail
                    per 21 CFR Part 11 / EU GMP Annex 11.
                  </p>
                  <p style="color:#9ca3af;font-size:12px;margin:8px 0 0">
                    QbD Research &amp; Development Lab Pvt. Ltd. · TCMS v0.1
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

// ── Core send function ────────────────────────────────────────────

export async function sendNotification(
  input: SendNotificationInput
): Promise<void> {
  // Always create in-app notification
  await prisma.notification.create({
    data: {
      personId: input.personId,
      type:     input.type,
      channel:  'IN_APP',
      title:    input.title,
      message:  input.message,
    },
  })

  // Send email if requested and email address provided
  if (input.sendEmail && input.email) {
    const person = await prisma.person.findUnique({
      where:  { id: input.personId },
      select: { name: true },
    })

    try {
      await sendEmail({
        to:      input.email,
        subject: EMAIL_SUBJECTS[input.type],
        html:    buildEmailHtml(
          input.title,
          input.message,
          person?.name ?? 'Team Member'
        ),
      })

      // Also record email notification
      await prisma.notification.create({
        data: {
          personId: input.personId,
          type:     input.type,
          channel:  'EMAIL',
          title:    input.title,
          message:  input.message,
          isRead:   true, // emails are auto-read
        },
      })
    } catch (error) {
      // Email failure must not block the operation
      console.error('[NOTIFICATION EMAIL ERROR]', error)
    }
  }
}

// ── Bulk send ─────────────────────────────────────────────────────

export async function sendBulkNotifications(
  personIds: string[],
  input: Omit<SendNotificationInput, 'personId' | 'email'>
): Promise<void> {
  await prisma.notification.createMany({
    data: personIds.map((personId) => ({
      personId,
      type:    input.type,
      channel: 'IN_APP' as const,
      title:   input.title,
      message: input.message,
    })),
  })
}

// ── Get notifications for a person ───────────────────────────────

export async function getNotifications(
  personId:  string,
  onlyUnread: boolean = false
) {
  const where: Record<string, unknown> = {
    personId,
    channel:  'IN_APP',
  }
  if (onlyUnread) where.isRead = false

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take:    50,
    }),
    prisma.notification.count({
      where: { personId, channel: 'IN_APP', isRead: false },
    }),
  ])

  return { notifications, unreadCount }
}

// ── Mark as read ──────────────────────────────────────────────────

export async function markNotificationRead(
  notificationId: string,
  personId:       string
): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, personId },
    data:  { isRead: true, readAt: new Date() },
  })
}

export async function markAllNotificationsRead(
  personId: string
): Promise<void> {
  await prisma.notification.updateMany({
    where: { personId, channel: 'IN_APP', isRead: false },
    data:  { isRead: true, readAt: new Date() },
  })
}

// ── Overdue reminder scanner ──────────────────────────────────────
// Called from the API route on a schedule (or triggered manually)
// Sends DUE_SOON reminders 3 days before due date
// Sends OVERDUE notifications when due date passes

export async function scanAndNotifyOverdue(): Promise<{
  dueSoon: number
  overdue: number
}> {
  const now     = new Date()
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  // ── Due soon (within 3 days, not yet notified) ─────────────────
  const dueSoonAssignments = await prisma.trainingAssignment.findMany({
    where: {
      status:  { in: ['NOT_STARTED', 'IN_PROGRESS'] },
      dueDate: { lte: in3Days, gte: now },
    },
    select: {
      id:       true,
      dueDate:  true,
      personId: true,
      person:   { select: { name: true } },
      topic:    { select: { name: true } },
    },
  })

  let dueSoonCount = 0
  for (const assignment of dueSoonAssignments) {
    // Check if we already sent a DUE_SOON notification for this assignment today
    const alreadySent = await prisma.notification.findFirst({
      where: {
        personId: assignment.personId,
        type:     'DUE_SOON',
        message:  { contains: assignment.topic.name },
        sentAt:   { gte: new Date(now.setHours(0, 0, 0, 0)) },
      },
    })
    if (alreadySent) continue

    const daysLeft = Math.ceil(
      (assignment.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    await prisma.notification.create({
      data: {
        personId: assignment.personId,
        type:     'DUE_SOON',
        channel:  'IN_APP',
        title:    'Training due soon',
        message:  `"${assignment.topic.name}" is due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Please complete it before the deadline.`,
      },
    })
    dueSoonCount++
  }

  // ── Overdue (past due date, not yet flagged today) ─────────────
  // Notifies the Trainee themselves, the Trainer who assigned it, and the
  // Trainee's reporting manager (if any) — all three parties per the SOP.
  const overdueAssignments = await prisma.trainingAssignment.findMany({
    where: {
      status:  { in: ['NOT_STARTED', 'IN_PROGRESS'] },
      dueDate: { lt: now },
    },
    select: {
      id:           true,
      dueDate:      true,
      personId:     true,
      assignedById: true,
      person:       { select: { name: true, employeeId: true, managerId: true } },
      topic:        { select: { name: true } },
    },
  })

  const startOfToday = new Date(now.setHours(0, 0, 0, 0))

  async function alreadyNotifiedToday(personId: string, topicName: string) {
    const existing = await prisma.notification.findFirst({
      where: {
        personId,
        type:    'OVERDUE',
        message: { contains: topicName },
        sentAt:  { gte: startOfToday },
      },
    })
    return !!existing
  }

  let overdueCount = 0
  for (const assignment of overdueAssignments) {
    if (await alreadyNotifiedToday(assignment.personId, assignment.topic.name)) continue

    const dueDateStr = assignment.dueDate.toLocaleDateString('en-IN')

    await prisma.notification.create({
      data: {
        personId: assignment.personId,
        type:     'OVERDUE',
        channel:  'IN_APP',
        title:    'Training overdue',
        message:  `"${assignment.topic.name}" was due on ${dueDateStr} and has not been completed. Please complete it immediately.`,
      },
    })
    overdueCount++

    // Trainer who assigned it
    if (assignment.assignedById !== assignment.personId) {
      await prisma.notification.create({
        data: {
          personId: assignment.assignedById,
          type:     'OVERDUE',
          channel:  'IN_APP',
          title:    'A training you assigned is overdue',
          message:  `${assignment.person.name} (${assignment.person.employeeId}) has not completed "${assignment.topic.name}", due ${dueDateStr}.`,
        },
      })
    }

    // Reporting manager
    if (assignment.person.managerId) {
      await prisma.notification.create({
        data: {
          personId: assignment.person.managerId,
          type:     'OVERDUE',
          channel:  'IN_APP',
          title:    'Your team member has an overdue training',
          message:  `${assignment.person.name} (${assignment.person.employeeId}) has not completed "${assignment.topic.name}", due ${dueDateStr}.`,
        },
      })
    }
  }

  // ── Qualification expiry (within 30 days) ──────────────────────
  const expiringQuals = await prisma.qualificationRecord.findMany({
    where: {
      status:     'APPROVED',
      expiryDate: {
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        gte: now,
      },
    },
    select: {
      personId:  true,
      expiryDate: true,
      technique: { select: { name: true } },
    },
  })

  for (const qual of expiringQuals) {
    const alreadySent = await prisma.notification.findFirst({
      where: {
        personId: qual.personId,
        type:     'QUALIFICATION_EXPIRY',
        message:  { contains: qual.technique.name },
        sentAt:   { gte: new Date(new Date().setDate(new Date().getDate() - 7)) },
      },
    })
    if (alreadySent) continue

    const daysLeft = Math.ceil(
      (qual.expiryDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    await prisma.notification.create({
      data: {
        personId: qual.personId,
        type:     'QUALIFICATION_EXPIRY',
        channel:  'IN_APP',
        title:    'Qualification expiring soon',
        message:  `Your qualification on "${qual.technique.name}" expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Please initiate re-qualification.`,
      },
    })
  }

  return { dueSoon: dueSoonCount, overdue: overdueCount }
}