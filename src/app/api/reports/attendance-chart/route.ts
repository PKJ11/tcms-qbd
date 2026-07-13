import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSectionsForReport, getAttendanceChartData } from '@/modules/reports'
import { PERMISSIONS, hasAnyRole } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!hasAnyRole(session.user, PERMISSIONS.VIEW_REPORTS)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)

  const sections = await getSectionsForReport()
  const buckets   = await getAttendanceChartData({
    sectionId: searchParams.get('sectionId') ?? undefined,
    months:    searchParams.get('months') ? Number(searchParams.get('months')) : undefined,
  })

  return NextResponse.json({ sections, buckets })
}
