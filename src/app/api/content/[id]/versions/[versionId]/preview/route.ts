import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getMaterialPreview } from '@/modules/content'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  try {
    const preview = await getMaterialPreview(params.id, params.versionId, session.user.id)
    return NextResponse.json(preview)

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load preview'
    return NextResponse.json({ message }, { status: 400 })
  }
}
