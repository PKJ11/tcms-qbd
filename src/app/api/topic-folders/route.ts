import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getFolderOverview } from '@/modules/topics/folders'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

// GET — every active folder with its active-topic count, plus how many active
// topics are not filed in any folder (shown as "No folder" on the Topics page).
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  if (!hasAnyRole(session.user, PERMISSIONS.AUTHOR_CONTENT)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json(await getFolderOverview())
}
