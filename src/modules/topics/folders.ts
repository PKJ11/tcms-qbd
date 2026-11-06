import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/modules/audit-trail'

// Topic folders — purely organisational grouping on the Training Topics page.
// Not a 'use server' module: these helpers are called from server actions
// and route handlers, never directly from the browser.

export const FOLDER_NAME_MAX = 60

export function normaliseFolderName(name: string): string {
  return name.replace(/\s+/g, ' ').trim()
}

export async function getTopicFolders() {
  const folders = await prisma.topicFolder.findMany({
    where:   { isActive: true },
    select:  {
      id:        true,
      name:      true,
      createdBy: { select: { id: true, name: true } },
      _count:    { select: { items: { where: { topic: { isActive: true } } } } },
    },
    orderBy: { name: 'asc' },
  })
  return folders.map((f) => ({
    id:         f.id,
    name:       f.name,
    createdBy:  f.createdBy,
    topicCount: f._count.items,
  }))
}

export type TopicFolderSummary = Awaited<ReturnType<typeof getTopicFolders>>[number]

// Everything the Training Topics home screen needs: each folder with its
// active-topic count, the total, and how many active topics are in no folder.
export async function getFolderOverview() {
  const [folders, unfiled, total] = await Promise.all([
    getTopicFolders(),
    prisma.trainingTopic.count({ where: { isActive: true, folderItems: { none: {} } } }),
    prisma.trainingTopic.count({ where: { isActive: true } }),
  ])
  return { folders, unfiled, total }
}

// Resolve the folders chosen for a topic: existing folder ids plus any new
// folder names typed in the form. A new name that matches an existing folder
// (ignoring case and spacing) reuses it instead of creating a duplicate.
// Returns the final folder ids and the folders that were newly created.
export async function resolveTopicFolders(
  tx:        Prisma.TransactionClient,
  folderIds: string[],
  newNames:  string[],
  actorId:   string,
): Promise<{ ids: string[]; created: { id: string; name: string }[] }> {
  const ids = new Set<string>()

  if (folderIds.length > 0) {
    const found = await tx.topicFolder.findMany({
      where:  { id: { in: folderIds }, isActive: true },
      select: { id: true },
    })
    if (found.length !== new Set(folderIds).size) throw new Error('One or more selected folders no longer exist')
    found.forEach((f) => ids.add(f.id))
  }

  const created: { id: string; name: string }[] = []
  for (const raw of newNames) {
    const name = normaliseFolderName(raw)
    if (!name) continue
    if (name.length > FOLDER_NAME_MAX) throw new Error(`Folder name is too long (max ${FOLDER_NAME_MAX} characters)`)

    const existing = await tx.topicFolder.findFirst({
      where:  { name: { equals: name, mode: 'insensitive' } },
      select: { id: true, isActive: true },
    })
    if (existing) {
      if (!existing.isActive) await tx.topicFolder.update({ where: { id: existing.id }, data: { isActive: true } })
      ids.add(existing.id)
      continue
    }
    const folder = await tx.topicFolder.create({
      data:   { name, createdById: actorId },
      select: { id: true, name: true },
    })
    created.push(folder)
    ids.add(folder.id)
  }

  if (ids.size === 0) throw new Error('Choose at least one folder for this topic')
  return { ids: [...ids], created }
}

async function topicFolderNames(topicId: string) {
  const rows = await prisma.topicFolderItem.findMany({
    where: { topicId }, select: { folder: { select: { name: true } } },
  })
  return rows.map((r) => r.folder.name).sort()
}

// File one or more existing topics into a folder. Topics already in the
// folder are skipped. Each topic that changes gets its own audit entry.
export async function addTopicsToFolder(folderId: string, topicIds: string[], justification: string, actorId: string) {
  const folder = await prisma.topicFolder.findFirst({ where: { id: folderId, isActive: true }, select: { id: true, name: true } })
  if (!folder) throw new Error('Folder not found')
  const ids = [...new Set(topicIds)]
  if (ids.length === 0) throw new Error('Choose at least one topic to add')

  const topics = await prisma.trainingTopic.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
  if (topics.length !== ids.length) throw new Error('One or more topics no longer exist')

  const already = new Set((await prisma.topicFolderItem.findMany({
    where: { folderId, topicId: { in: ids } }, select: { topicId: true },
  })).map((r) => r.topicId))
  const toAdd = topics.filter((t) => !already.has(t.id))

  for (const t of toAdd) {
    const before = await topicFolderNames(t.id)
    await prisma.topicFolderItem.create({ data: { folderId, topicId: t.id } })
    await logAuditEvent({
      userId: actorId, action: 'UPDATE', module: 'TRAINING_TOPIC', recordId: t.id, recordType: 'TrainingTopic',
      beforeValue: { name: t.name, folders: before },
      afterValue:  { name: t.name, folders: [...before, folder.name].sort() },
      justification: `Added to folder "${folder.name}": ${justification}`,
    })
  }
  return { added: toAdd.length, skipped: ids.length - toAdd.length }
}

// Take a topic out of a folder. A topic must stay in at least one folder.
export async function removeTopicFromFolder(folderId: string, topicId: string, justification: string, actorId: string) {
  const item = await prisma.topicFolderItem.findUnique({
    where:  { folderId_topicId: { folderId, topicId } },
    select: { id: true, folder: { select: { name: true } }, topic: { select: { name: true } } },
  })
  if (!item) throw new Error('This topic is not in that folder')

  const before = await topicFolderNames(topicId)
  if (before.length <= 1) {
    throw new Error(`"${item.topic.name}" is only in this folder. Add it to another folder first — every topic must stay in at least one folder.`)
  }

  await prisma.topicFolderItem.delete({ where: { id: item.id } })
  await logAuditEvent({
    userId: actorId, action: 'UPDATE', module: 'TRAINING_TOPIC', recordId: topicId, recordType: 'TrainingTopic',
    beforeValue: { name: item.topic.name, folders: before },
    afterValue:  { name: item.topic.name, folders: before.filter((n) => n !== item.folder.name) },
    justification: `Removed from folder "${item.folder.name}": ${justification}`,
  })
}

// Folder names for the audit trail
export async function folderNames(tx: Prisma.TransactionClient | typeof prisma, ids: string[]) {
  const rows = await tx.topicFolder.findMany({ where: { id: { in: ids } }, select: { name: true }, orderBy: { name: 'asc' } })
  return rows.map((r) => r.name)
}
