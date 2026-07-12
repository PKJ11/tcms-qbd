import { NextRequest, NextResponse }   from 'next/server'
import { getSession }                  from '@/lib/auth'
import { getCompetencyMatrix }         from '@/modules/qualification'
import { PERMISSIONS, hasAnyRole }     from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.VIEW_QUALIFICATIONS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)

  const matrix = await getCompetencyMatrix({
    departmentId: searchParams.get('departmentId') ?? undefined,
  })

  return NextResponse.json(matrix)
}