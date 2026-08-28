import { prisma } from '@/lib/prisma'

export interface PasswordPolicyValues {
  policyName:           string
  authMode:             string   // 'DB' | 'LDAP'
  passwordExpiryDays:   number
  failedAttemptLimit:   number
  minPasswordLength:    number
  passwordHistoryCount: number   // "last N passwords used" — cannot be reused
}

// Fallback used only if the singleton row does not exist yet.
export const DEFAULT_PASSWORD_POLICY: PasswordPolicyValues = {
  policyName:           'Password Policy',
  authMode:             'DB',
  passwordExpiryDays:   45,
  failedAttemptLimit:   3,
  minPasswordLength:    8,
  passwordHistoryCount: 3,
}

/**
 * Reads the admin-configured password policy. Pure DB read — no auth
 * imports — so it is safe to call from `@/lib/auth` without a cycle.
 */
export async function getPasswordPolicy(): Promise<PasswordPolicyValues & { updatedAt: Date | null }> {
  const row = await prisma.passwordPolicy.findUnique({ where: { key: 'default' } })
  if (!row) return { ...DEFAULT_PASSWORD_POLICY, updatedAt: null }

  return {
    policyName:           row.policyName,
    authMode:             row.authMode,
    passwordExpiryDays:   row.passwordExpiryDays,
    failedAttemptLimit:   row.failedAttemptLimit,
    minPasswordLength:    row.minPasswordLength,
    passwordHistoryCount: row.passwordHistoryCount,
    updatedAt:            row.updatedAt,
  }
}
