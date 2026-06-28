import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { AuditEventPayload } from './types'

/**
 * logAuditEvent — call this on EVERY write operation in the system.
 *
 * WHO   → userId
 * WHEN  → captured automatically (createdAt = now())
 * WHAT  → action + recordType + recordId + before/after
 * WHY   → justification (mandatory)
 *
 * URS-CMP-002 — ALCOA+ compliant audit trail
 */
export async function logAuditEvent(
  payload: AuditEventPayload
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId:        payload.userId,
        action:        payload.action,
        module:        payload.module,
        recordId:      payload.recordId,
        recordType:    payload.recordType,
        beforeValue:   payload.beforeValue ?? Prisma.JsonNull,
        afterValue:    payload.afterValue  ?? Prisma.JsonNull,
        justification: payload.justification,
        ipAddress:     payload.ipAddress   ?? null,
        userAgent:     payload.userAgent   ?? null,
      },
    })
  } catch (error) {
    console.error('[AUDIT TRAIL ERROR]', error)
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Audit trail write failed — action aborted')
    }
  }
}

/**
 * logAuthEvent — convenience wrapper for login/logout events
 * These do not need a justification box — the action itself is the reason
 */
export async function logAuthEvent(params: {
  userId:     string
  action:     'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE'
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  const justificationMap = {
    LOGIN:           'User authenticated successfully',
    LOGOUT:          'User logged out',
    PASSWORD_CHANGE: 'User changed their password',
  }

  await logAuditEvent({
    userId:        params.userId,
    action:        params.action === 'PASSWORD_CHANGE' ? 'UPDATE' : 'LOGIN',
    module:        'AUTH',
    recordId:      params.userId,
    recordType:    'Person',
    beforeValue:   null,
    afterValue:    null,
    justification: justificationMap[params.action],
    ipAddress:     params.ipAddress,
    userAgent:     params.userAgent,
  })
}