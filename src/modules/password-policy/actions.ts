'use server'

import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'
import { verifyUserPassword } from '@/lib/auth'
import {
  getPasswordPolicy,
  type PasswordPolicyValues,
} from '@/lib/password-policy'

export { getPasswordPolicy }
export type { PasswordPolicyValues }

function requireInt(value: unknown, min: number, max: number, field: string): number {
  const n = typeof value === 'string' ? Number(value) : (value as number)
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`${field} must be a whole number between ${min} and ${max}`)
  }
  return n
}

export async function updatePasswordPolicy(
  input: Partial<PasswordPolicyValues>,
  justification: string,
  actorId: string,
  password: string,
) {
  const passwordValid = await verifyUserPassword(actorId, password)
  if (!passwordValid) throw new Error('Incorrect password')

  const current = await getPasswordPolicy()
  const before: PasswordPolicyValues = {
    policyName:           current.policyName,
    authMode:             current.authMode,
    passwordExpiryDays:   current.passwordExpiryDays,
    failedAttemptLimit:   current.failedAttemptLimit,
    minPasswordLength:    current.minPasswordLength,
    passwordHistoryCount: current.passwordHistoryCount,
  }

  const data = {
    policyName:           (input.policyName ?? before.policyName).trim() || 'Password Policy',
    authMode:             'DB',   // DB-only — LDAP is not supported
    passwordExpiryDays:   requireInt(input.passwordExpiryDays   ?? before.passwordExpiryDays,   1,  3650, 'Password expiry days'),
    failedAttemptLimit:   requireInt(input.failedAttemptLimit   ?? before.failedAttemptLimit,   1,  20,   'Failed password attempt'),
    minPasswordLength:    requireInt(input.minPasswordLength    ?? before.minPasswordLength,    6,  128,  'Minimum password length'),
    passwordHistoryCount: requireInt(input.passwordHistoryCount ?? before.passwordHistoryCount, 1,  24,   'Last password used'),
  }

  await prisma.passwordPolicy.upsert({
    where:  { key: 'default' },
    update: { ...data, updatedById: actorId },
    create: { key: 'default', ...data, updatedById: actorId },
  })

  await logAuditEvent({
    userId:        actorId,
    action:        'UPDATE',
    module:        'ADMIN',
    recordId:      'password-policy',
    recordType:    'PasswordPolicy',
    beforeValue:   before,
    afterValue:    data,
    justification,
  })

  return data
}
