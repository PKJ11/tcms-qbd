import { prisma } from '@/lib/prisma'

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