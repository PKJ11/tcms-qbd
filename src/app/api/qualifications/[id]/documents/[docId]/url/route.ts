import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getScannedDocumentUrl } from '@/modules/qualification'
import { PERMISSIONS, hasAnyRole, canManageQualifications } from '@/lib/permissions'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  // The document must belong to the qualification in the URL
  const doc = await prisma.scannedDocument.findUnique({
    where:  { id: params.docId },
    select: { qualificationId: true, qualification: { select: { personId: true } } },
  })
  if (!doc || doc.qualificationId !== params.id) {
    return NextResponse.json({ message: 'Document not found' }, { status: 404 })
  }

  // Same visibility as the Qualifications page: QA managers and org-wide
  // roles (Trainer, Guest Trainer, Viewer) see every record; anyone else
  // only the evidence on their own qualification.
  const canView =
    canManageQualifications(session.user) ||
    hasAnyRole(session.user, PERMISSIONS.VIEW_QUALIFICATIONS) ||
    doc.qualification.personId === session.user.id
  if (!canView) {
    return NextResponse.json({ message: 'You do not have access to this document' }, { status: 403 })
  }

  try {
    const url = await getScannedDocumentUrl(params.docId)
    return NextResponse.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get URL'
    return NextResponse.json({ message }, { status: 400 })
  }
}
