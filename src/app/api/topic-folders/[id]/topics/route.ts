import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { addTopicsToFolder, removeTopicFromFolder } from '@/modules/topics/folders'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

async function authorise() {
  const session = await getSession()
  if (!session) return { error: NextResponse.json({ message: 'Unauthorised' }, { status: 401 }) }
  if (!hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)) {
    return { error: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}

// POST { topicIds: string[], justification } — add existing topics to this folder
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await authorise()
  if (error) return error
  const { topicIds, justification } = await req.json()
  if (!justification) return NextResponse.json({ message: 'Justification is required' }, { status: 400 })
  if (!Array.isArray(topicIds)) return NextResponse.json({ message: 'topicIds must be a list' }, { status: 400 })
  try {
    const result = await addTopicsToFolder(params.id, topicIds, justification, session.user.id)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Failed to add topics' }, { status: 400 })
  }
}

// DELETE { topicId, justification } — take a topic out of this folder
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await authorise()
  if (error) return error
  const { topicId, justification } = await req.json()
  if (!justification) return NextResponse.json({ message: 'Justification is required' }, { status: 400 })
  if (!topicId) return NextResponse.json({ message: 'topicId is required' }, { status: 400 })
  try {
    await removeTopicFromFolder(params.id, topicId, justification, session.user.id)
    return NextResponse.json({ message: 'Removed' })
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Failed to remove topic' }, { status: 400 })
  }
}
