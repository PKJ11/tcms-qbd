import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { uploadScannedDocument } from '@/modules/qualification'
import { prisma } from '@/lib/prisma'
import type { UserRole } from '@/lib/types'

const CAN_UPLOAD: UserRole[] = ['TRAINING_HEAD', 'SUPER_ADMIN', 'TRAINER']

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const documents = await prisma.scannedDocument.findMany({
    where:   { qualificationId: params.id },
    select:  {
      id:          true,
      fileName:    true,
      fileType:    true,
      description: true,
      uploadedAt:  true,
      uploadedBy:  { select: { id: true, name: true } },
    },
    orderBy: { uploadedAt: 'desc' },
  })

  return NextResponse.json({ documents })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }
  if (!CAN_UPLOAD.includes(session.user.role as UserRole)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    const formData    = await req.formData()
    const file        = formData.get('file')        as File   | null
    const description = formData.get('description') as string | null

    if (!file || !description) {
      return NextResponse.json(
        { message: 'File and description are required' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    const doc = await uploadScannedDocument(
      params.id,
      buffer,
      file.name,
      file.size,
      file.name.split('.').pop() ?? 'pdf',
      description,
      session.user.id
    )

    return NextResponse.json({ doc }, { status: 201 })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}