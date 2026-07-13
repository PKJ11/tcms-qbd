import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { previewNextEmployeeId } from '@/modules/personnel'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  if (!hasAnyRole(session.user, PERMISSIONS.MANAGE_USERS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  if (type !== 'GUEST' && type !== 'CONTRACTUAL') {
    return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
  }

  const employeeId = await previewNextEmployeeId(type)
  return NextResponse.json({ employeeId })
}
