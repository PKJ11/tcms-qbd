import { NextRequest, NextResponse } from 'next/server'
import { getSession }               from '@/lib/auth'
import { confirmAssignmentMaterial } from '@/modules/assignments'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; materialId: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  try {
    const result = await confirmAssignmentMaterial(params.id, params.materialId, session.user.id)
    return NextResponse.json({
      message:      'Material confirmed',
      completed:    result.completed,
      allConfirmed: result.allConfirmed,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to confirm material'
    return NextResponse.json({ message }, { status: 400 })
  }
}
