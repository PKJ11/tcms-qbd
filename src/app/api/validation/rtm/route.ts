import { NextResponse }    from 'next/server'
import { getSession }      from '@/lib/auth'
import { getRTMSummary }   from '@/modules/validation'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })

  const data = await getRTMSummary()
  return NextResponse.json(data)
}