import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getCompetencyMatrix } from '@/modules/qualification'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)

  const matrix = await getCompetencyMatrix({
    departmentId: searchParams.get('departmentId') ?? undefined,
    unitId:       searchParams.get('unitId')       ?? undefined,
  })

  return NextResponse.json(matrix)
}