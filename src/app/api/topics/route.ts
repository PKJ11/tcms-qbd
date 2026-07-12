import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTopics, createTopic } from '@/modules/topics'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)

  const topics = await getTopics({
    departmentId: searchParams.get('departmentId') ?? undefined,
    isActive:     searchParams.get('isActive') === 'false' ? false : true,
    search:       searchParams.get('search')    ?? undefined,
  })

  return NextResponse.json({ topics })
}

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  if (!hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { justification, ...input } = body

  if (!justification) {
    return NextResponse.json(
      { message: 'Justification is required' },
      { status: 400 }
    )
  }

  try {
    const topic = await createTopic(input, justification, session.user.id)
    return NextResponse.json({ topic }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Failed to create topic'
    return NextResponse.json({ message }, { status: 400 })
  }
}