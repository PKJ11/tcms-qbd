import type { AppRole } from '@prisma/client'

export type SessionUser = { roles: AppRole[] }

export function hasRole(user: SessionUser, role: AppRole): boolean {
  return user.roles.includes(role)
}

export function hasAnyRole(user: SessionUser, roles: AppRole[]): boolean {
  return roles.some((r) => user.roles.includes(r))
}

export const PERMISSIONS = {
  MANAGE_USERS:         ['ADMINISTRATOR'],
  MANAGE_ORG:           ['ADMINISTRATOR'],
  AUTHOR_CONTENT:       ['TRAINER', 'GUEST_TRAINER'],
  ASSIGN_TRAINING:      ['TRAINER', 'GUEST_TRAINER'],
  APPROVE_CONTENT:      ['TRAINER', 'GUEST_TRAINER'],
  MANAGE_REFRESHER:     ['TRAINER', 'GUEST_TRAINER'],
  MANAGE_QUALIFICATIONS: ['TRAINER', 'GUEST_TRAINER'],
  ATTEND_TRAINING:      ['TRAINEE'],
  VIEW_REPORTS:         ['ADMINISTRATOR', 'VIEWER', 'TRAINER', 'GUEST_TRAINER'],
  VIEW_AUDIT_TRAIL:     ['ADMINISTRATOR', 'VIEWER'],
  VIEW_PERSONNEL:       ['ADMINISTRATOR', 'VIEWER'],
  VIEW_QUALIFICATIONS:  ['TRAINER', 'GUEST_TRAINER', 'VIEWER'],
} as const satisfies Record<string, AppRole[]>

export type Permission = keyof typeof PERMISSIONS

export function can(user: SessionUser, permission: Permission): boolean {
  return hasAnyRole(user, PERMISSIONS[permission] as AppRole[])
}

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMINISTRATOR:        'Administrator',
  VIEWER:               'Viewer',
  TRAINER:              'Trainer',
  TRAINEE:              'Trainee',
  GUEST_TRAINER:        'Guest Trainer',
  CONTRACTUAL_EMPLOYEE: 'Contractual Employee',
}

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  ADMINISTRATOR:        'Have rights of user management',
  VIEWER:               'Have rights of view only',
  TRAINER:              'Can prepare training material and assign trainings',
  TRAINEE:              'Have rights to attend trainings',
  GUEST_TRAINER:        'External trainer, have rights to provide trainings',
  CONTRACTUAL_EMPLOYEE: 'Have rights of Trainer as well as Trainee, depending on assigned role(s)',
}

export const ROLE_COLORS: Record<AppRole, { bg: string; color: string }> = {
  ADMINISTRATOR:        { bg: '#fef2f2', color: '#dc2626' },
  VIEWER:                { bg: '#fefce8', color: '#854d0e' },
  TRAINER:               { bg: '#f5f3ff', color: '#6d28d9' },
  TRAINEE:               { bg: '#f0fdf4', color: '#166534' },
  GUEST_TRAINER:         { bg: '#fff7ed', color: '#c2410c' },
  CONTRACTUAL_EMPLOYEE:  { bg: '#eff6ff', color: '#1d4ed8' },
}
