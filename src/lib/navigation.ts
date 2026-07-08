import type { UserRole } from '@/lib/types'

export interface NavItem {
  label:     string
  href:      string
  icon:      string
  roles:     UserRole[]  // empty = all roles
  badge?:    string
  children?: NavItem[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href:  '/dashboard',
    icon:  'grid',
    roles: [],  // all roles
  },
  {
    label: 'Notifications',    // ← add here
    href:  '/notifications',
    icon:  'bell',
    roles: [],
  },
  {
    label: 'Personnel',
    href:  '/personnel',
    icon:  'users',
    roles: ['MANAGER', 'TRAINER', 'TRAINING_HEAD', 'SUPER_ADMIN', 'MD'],
  },
  {
    label: 'Training Topics',
    href:  '/topics',
    icon:  'book-open',
    roles: ['TRAINER', 'TRAINING_HEAD', 'SUPER_ADMIN', 'MD'],
  },
  {
    label: 'Materials',
    href:  '/content',
    icon:  'file-text',
    roles: ['TRAINER', 'TRAINING_HEAD', 'SUPER_ADMIN', 'MD'],
  },
  {
    label: 'Assignments',
    href:  '/assignments',
    icon:  'clipboard',
    roles: [],  // all roles — users see their own
  },
  {
    label: 'Assessments',
    href:  '/assessments',
    icon:  'check-square',
    roles: [],  // all roles
  },
  {
    label: 'Qualifications',
    href:  '/qualifications',
    icon:  'award',
    roles: ['TRAINER', 'TRAINING_HEAD', 'SUPER_ADMIN', 'MD'],
  },
  {
    label: 'Refresher',
    href:  '/refresher',
    icon:  'refresh-cw',
    roles: ['TRAINING_HEAD', 'SUPER_ADMIN'],
  },
  {
    label: 'Reports',
    href:  '/reports',
    icon:  'bar-chart-2',
    roles: ['MANAGER', 'TRAINER', 'TRAINING_HEAD', 'SUPER_ADMIN', 'MD'],
  },
  {
    label: 'Audit Trail',
    href:  '/audit-trail',
    icon:  'shield',
    roles: ['TRAINING_HEAD', 'SUPER_ADMIN', 'MD'],
  },
  {
    label: 'Admin',
    href:  '/admin',
    icon:  'settings',
    roles: ['SUPER_ADMIN'],
  },
]

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.roles.length === 0 || item.roles.includes(role)
  )
}

export const ROLE_LABELS: Record<UserRole, string> = {
  USER:          'User',
  MANAGER:       'Manager',
  TRAINER:       'Trainer',
  TRAINING_HEAD: 'Training Head',
  SUPER_ADMIN:   'Super Admin',
  MD:            'Managing Director',
}

export const ROLE_COLORS: Record<UserRole, { bg: string; color: string }> = {
  USER:          { bg: '#f0fdf4', color: '#166534' },
  MANAGER:       { bg: '#eff6ff', color: '#1d4ed8' },
  TRAINER:       { bg: '#f5f3ff', color: '#6d28d9' },
  TRAINING_HEAD: { bg: '#fff7ed', color: '#c2410c' },
  SUPER_ADMIN:   { bg: '#fef2f2', color: '#dc2626' },
  MD:            { bg: '#fefce8', color: '#854d0e' },
}