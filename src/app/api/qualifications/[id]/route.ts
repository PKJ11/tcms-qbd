import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  getQualificationById,
  signQualification,
  rejectQualification,
} from '@/modules/qualification'
import { canManageQualifications } from '@/lib/permissions'
import { formatDate } from '@/lib/utils'
import { QualificationRecordPdf } from '@/modules/reports/pdf/QualificationRecordPdf'
import { renderReportPdf } from '@/modules/reports/pdf/render'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const qualification = await getQualificationById(params.id)
  if (!qualification) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  const format = req.nextUrl.searchParams.get('format')

  if (format === 'pdf') {
    const buffer = await renderReportPdf(
      QualificationRecordPdf({
        qual: qualification,
        preparedByName: session.user.name,
        preparedDate:   formatDate(new Date()),
      })
    )
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="qualification-${params.id}.pdf"`,
      },
    })
  }

  return NextResponse.json({ qualification })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const { justification, action, password, nextAssigneeId } = body

  if (!justification) {
    return NextResponse.json(
      { message: 'Justification is required' },
      { status: 400 }
    )
  }

  try {
    if (action === 'sign') {
      if (!password) {
        return NextResponse.json(
          { message: 'Password is required to sign off' },
          { status: 400 }
        )
      }
      const result = await signQualification(params.id, justification, password, session.user.id, nextAssigneeId)
      return NextResponse.json({
        message:      result.willApprove ? 'Qualification fully approved' : 'Step signed successfully',
        fullyApproved: result.willApprove,
      })
    }

    if (action === 'reject') {
      if (!canManageQualifications(session.user)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
      }
      await rejectQualification(params.id, justification, session.user.id)
      return NextResponse.json({ message: 'Qualification rejected' })
    }

    return NextResponse.json({ message: 'Unknown action' }, { status: 400 })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Operation failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}