import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPasswordPolicy } from '@/modules/password-policy'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'
import { PasswordPolicyForm } from '@/components/security/PasswordPolicyForm'

export default async function PasswordPolicyPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_USERS)) redirect('/unauthorised')

  const policy = await getPasswordPolicy()

  return (
    <div className="min-h-screen p-6" style={{ background: '#f4f6f8' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Password Policy</h1>
          <p className="text-sm text-gray-500 mt-1">
            These values are applied to every account. Changing them takes effect immediately.
          </p>
        </div>

        <PasswordPolicyForm
          initial={{
            policyName:           policy.policyName,
            authMode:             policy.authMode,
            passwordExpiryDays:   policy.passwordExpiryDays,
            failedAttemptLimit:   policy.failedAttemptLimit,
            minPasswordLength:    policy.minPasswordLength,
            passwordHistoryCount: policy.passwordHistoryCount,
          }}
        />
      </div>
    </div>
  )
}
