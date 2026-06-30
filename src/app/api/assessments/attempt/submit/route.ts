import { NextRequest, NextResponse } from 'next/server'
import { getSession }   from '@/lib/auth'
import { submitAttempt } from '@/modules/assessment'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()

  try {
    const result = await submitAttempt(body, session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit attempt'
    return NextResponse.json({ message }, { status: 400 })
  }
}