import { NextRequest, NextResponse } from 'next/server'
import { getSession }            from '@/lib/auth'
import { getEligibleSignatories } from '@/modules/qualification'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const department = searchParams.get('department')

  if (department !== 'QC' && department !== 'QA') {
    return NextResponse.json({ message: 'department must be QC or QA' }, { status: 400 })
  }

  const signatories = await getEligibleSignatories(department)
  return NextResponse.json({ signatories })
}
