import { NextRequest, NextResponse } from 'next/server'
import { getSession }      from '@/lib/auth'
import { startAssignment } from '@/modules/assignments'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  try {
    await startAssignment(params.id, session.user.id)
    return NextResponse.json({ message: 'Assignment started' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start'
    return NextResponse.json({ message }, { status: 400 })
  }
}