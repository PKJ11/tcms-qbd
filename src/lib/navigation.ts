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
    label: 'Manage Users',
    href:  '/personnel',
    icon:  'users',
    roles: ['ADMINISTRATOR', 'VIEWER'],
  },
  {
    label: 'Roles Details',
    href:  '/roles',
    icon:  'key',
    roles: ['ADMINISTRATOR'],
  },
  {
    label: 'Organization Structure',
    href:  '/organization',
    icon:  'sitemap',
    roles: ['ADMINISTRATOR', 'VIEWER'],
  },
  {
    label: 'Manage Structure',
    href:  '/admin/organization',
    icon:  'layers',
    roles: ['ADMINISTRATOR'],
  },
  {
    label: 'Password Policy',
    href:  '/password-policy',
    icon:  'lock',
    roles: ['ADMINISTRATOR'],
  },
  {
    label: 'Training Topics',
    href:  '/topics',
    icon:  'book-open',
    roles: ['TRAINER', 'GUEST_TRAINER'],
  },
  {
    label: 'Topic Group',
    href:  '/topic-group',
    icon:  'layers',
    roles: ['TRAINER', 'GUEST_TRAINER'],
  },
  {
    label: 'Assignments',
    href:  '/assignments',
    icon:  'clipboard',
    roles: [],  // all roles — users see their own
  },
  {
    label: 'Qualifications',
    href:  '/qualifications',
    icon:  'award',
    roles: ['TRAINER', 'GUEST_TRAINER', 'VIEWER', 'TRAINEE'],
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
]

export function getNavItemsForRole(roles: AppRole[]): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.roles.length === 0 || item.roles.some((r) => roles.includes(r))
  )
}

export { ROLE_LABELS, ROLE_COLORS }
