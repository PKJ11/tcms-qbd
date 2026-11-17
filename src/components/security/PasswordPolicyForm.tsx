import type { PasswordPolicyValues } from '@/modules/password-policy'
import { PASSWORD_COMPLEXITY_SUMMARY } from '@/lib/password-complexity'

// The password policy is fixed: every field is shown greyed out and read-only.
export function PasswordPolicyForm({ initial }: { initial: PasswordPolicyValues }) {
  const labelClass = 'block text-sm font-medium text-gray-500 mb-1.5'
  const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm outline-none cursor-not-allowed'
  const inputStyle = { borderColor: '#e5e7eb', background: '#f3f4f6', color: '#6b7280' }

  const fields: { label: string; value: string | number; hint?: string; full?: boolean }[] = [
    { label: 'Policy Name',             value: initial.policyName },
    { label: 'Auth Mode',               value: 'DB' },
    { label: 'Password Expiry Days',    value: initial.passwordExpiryDays },
    { label: 'Failed Password Attempt', value: initial.failedAttemptLimit },
    { label: 'Minimum Password Length', value: initial.minPasswordLength },
    {
      label: 'Last Password Used',
      value: initial.passwordHistoryCount,
      hint:  `A new password cannot match any of the user's last ${initial.passwordHistoryCount || 1} passwords.`,
    },
    { label: 'Password Complexity', value: PASSWORD_COMPLEXITY_SUMMARY, full: true },
  ]

  return (
    <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e5e7eb' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {fields.map((f) => (
          <div key={f.label} className={f.full ? 'sm:col-span-2' : undefined}>
            <label className={labelClass}>{f.label}</label>
            <input
              className={inputClass}
              style={inputStyle}
              value={f.value}
              disabled
              readOnly
              aria-readonly
            />
            {f.hint && <p className="text-xs text-gray-400 mt-1">{f.hint}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
