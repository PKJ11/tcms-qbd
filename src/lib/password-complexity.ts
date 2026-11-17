// Password complexity rules — shared by the change-password page (client) and API (server).

export const PASSWORD_COMPLEXITY_RULES = [
  { id: 'upper',   label: 'At least one capital letter (A–Z)',            test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'At least one small letter (a–z)',              test: (p: string) => /[a-z]/.test(p) },
  { id: 'number',  label: 'At least one number (0–9)',                    test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'At least one special character (e.g. @ # $ !)', test: (p: string) => /[^A-Za-z0-9\s]/.test(p) },
] as const

export const PASSWORD_COMPLEXITY_SUMMARY =
  'At least one capital letter, one small letter, one number and one special character'

export const PASSWORD_COMPLEXITY_ERROR =
  'Password must contain at least one capital letter, one small letter, one number and one special character'

export function meetsPasswordComplexity(password: string): boolean {
  return PASSWORD_COMPLEXITY_RULES.every((r) => r.test(password))
}
