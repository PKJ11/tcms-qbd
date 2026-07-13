import type { AppRole } from '@/lib/types'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/permissions'

export interface NavItem {
  label:     string
  href:      string
  icon:      string
  roles:     AppRole[]  // empty = all roles
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
    label: 'Notifications',
    href:  '/notifications',
    icon:  'bell',
    roles: [],
  },
  {
    label: 'Personnel',
    href:  '/personnel',
    icon:  'users',
    roles: ['ADMINISTRATOR', 'VIEWER'],
  },
  {
    label: 'Training Topics',
    href:  '/topics',
    icon:  'book-open',
    roles: ['TRAINER', 'GUEST_TRAINER'],
  },
  {
    label: 'Materials',
    href:  '/content',
    icon:  'file-text',
    roles: ['TRAINER', 'GUEST_TRAINER'],
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
    roles: ['ADMINISTRATOR', 'VIEWER', 'TRAINER', 'GUEST_TRAINER'],
  },
  {
    label: 'Qualifications',
    href:  '/qualifications',
    icon:  'award',
    roles: ['TRAINER', 'GUEST_TRAINER', 'VIEWER'],
  },
  {
    label: 'Refresher',
    href:  '/refresher',
    icon:  'refresh-cw',
    roles: ['TRAINER', 'GUEST_TRAINER'],
  },
  {
    label: 'Reports',
    href:  '/reports',
    icon:  'bar-chart-2',
    roles: ['VIEWER', 'TRAINER'],
  },
  {
    label: 'Audit Trail',
    href:  '/audit-trail',
    icon:  'shield',
    roles: ['ADMINISTRATOR', 'VIEWER'],
  },
  {
    label: 'Admin',
    href:  '/admin',
    icon:  'settings',
    roles: ['ADMINISTRATOR'],
  },
]

export function getNavItemsForRole(roles: AppRole[]): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.roles.length === 0 || item.roles.some((r) => roles.includes(r))
  )
}

export { ROLE_LABELS, ROLE_COLORS }
