import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getScannedDocumentUrl } from '@/modules/qualification'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  try {
    const url = await getScannedDocumentUrl(params.docId)
    return NextResponse.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get URL'
    return NextResponse.json({ message }, { status: 400 })
  }
}