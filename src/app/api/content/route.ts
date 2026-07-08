import { NextRequest, NextResponse } from 'next/server'
import { getSession }    from '@/lib/auth'
import { getMaterials, uploadMaterial } from '@/modules/content'
import type { UserRole } from '@/lib/types'
import type { CreateMaterialInput, FileType, VersionType } from '@/modules/content'

const CAN_UPLOAD: UserRole[] = ['TRAINING_HEAD', 'ADMINISTRATOR']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)

  const materials = await getMaterials({
    topicId: searchParams.get('topicId') ?? undefined,
    status:  searchParams.get('status')  ?? undefined,
    search:  searchParams.get('search')  ?? undefined,
  })

  return NextResponse.json({ materials })
}

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  if (!CAN_UPLOAD.includes(session.user.role as UserRole)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    // Parse multipart form data
    const formData = await req.formData()

    const file          = formData.get('file')          as File   | null
    const title         = formData.get('title')         as string | null
    const topicId       = formData.get('topicId')       as string | null
    const changeSummary = formData.get('changeSummary') as string | null
    const effectiveDate = formData.get('effectiveDate') as string | null
    const versionType   = formData.get('versionType')   as string | null
    const fileType      = formData.get('fileType')      as string | null
    const justification = formData.get('justification') as string | null

    if (!file || !title || !topicId || !changeSummary ||
        !effectiveDate || !versionType || !fileType || !justification) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    const input: CreateMaterialInput = {
      title,
      topicId,
      changeSummary,
      effectiveDate,
      versionType:  versionType as VersionType,
      fileType:     fileType    as FileType,
    }

    const result = await uploadMaterial(
      input,
      buffer,
      file.name,
      file.size,
      justification,
      session.user.id
    )

    return NextResponse.json({ result }, { status: 201 })

  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Upload failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}