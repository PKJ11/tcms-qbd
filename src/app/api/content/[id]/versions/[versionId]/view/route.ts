import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getViewUrl } from '@/modules/content'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  try {
    const url = await getViewUrl(params.versionId, session.user.id)
    return NextResponse.json({ url })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get URL'
    return NextResponse.json({ message }, { status: 400 })
  }
}