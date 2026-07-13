import { prisma }   from '@/lib/prisma'
import type { AppRole } from '@prisma/client'

// Roles that can see org-wide ("All data") report scope, as opposed to
// being scoped down to their own reporting chain.
export const REPORT_OVERSIGHT_ROLES: AppRole[] = ['ADMINISTRATOR', 'VIEWER', 'TRAINER', 'GUEST_TRAINER']

/**
 * Get IDs of all active direct reports for a given manager/trainer.
 * Used across multiple modules to scope data visibility.
 */
export async function getSubordinateIds(managerId: string): Promise<string[]> {
  const subordinates = await prisma.person.findMany({
    where:  { managerId, isActive: true },
    select: { id: true },
  })
  return subordinates.map((s) => s.id)
}

/**
 * Check if a given personId is a direct report of managerId.
 * Used for access control checks.
 */
export async function isSubordinate(
  managerId: string,
  personId:  string
): Promise<boolean> {
  const person = await prisma.person.findFirst({
    where:  { id: personId, managerId, isActive: true },
    select: { id: true },
  })
  return !!person
}

/**
 * Get IDs of everyone under a manager/trainer down the reporting chain —
 * direct reports, their reports, and so on to the end. Used for the
 * "My team" report scope, as opposed to "My reportees" (direct only).
 */
export async function getTeamIds(managerId: string): Promise<string[]> {
  const team: string[] = []
  let frontier = [managerId]

  while (frontier.length > 0) {
    const nextLevel = await prisma.person.findMany({
      where:  { managerId: { in: frontier }, isActive: true },
      select: { id: true },
    })
    const nextIds = nextLevel.map((p) => p.id)
    team.push(...nextIds)
    frontier = nextIds
  }

  return team
}

/**
 * Check if personId is anywhere under managerId in the reporting chain
 * (direct or indirect). Used for access control on per-person views.
 */
export async function isInTeam(
  managerId: string,
  personId:  string
): Promise<boolean> {
  const team = await getTeamIds(managerId)
  return team.includes(personId)
}

/**
 * Resolve a report "scope" query param ('all' | 'team' | 'reportees') into
 * the person-ID filter a report query should apply. Only REPORT_OVERSIGHT_ROLES
 * may request org-wide "all" data — everyone else is capped to their own
 * reporting chain even if they ask for "all", so this is safe to call
 * directly off untrusted request input.
 * Returns undefined for "no filter" (org-wide).
 */
export async function resolveScopeFilter(
  user:  { id: string; roles: AppRole[] },
  scope: string | null
): Promise<string[] | undefined> {
  const isOversight = user.roles.some((r) => REPORT_OVERSIGHT_ROLES.includes(r))

  if (scope === 'reportees') return getSubordinateIds(user.id)
  if (scope === 'team')      return getTeamIds(user.id)
  if (scope === 'all' && isOversight) return undefined

  return getTeamIds(user.id)
}