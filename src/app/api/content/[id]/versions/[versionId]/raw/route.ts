import { NextRequest, NextResponse }      from 'next/server'
import { Readable }                       from 'stream'
import { getSession }                     from '@/lib/auth'
import { prisma }                         from '@/lib/prisma'
import { getFileBuffer, getObjectStream } from '@/lib/storage'

// Streams PDF/video bytes straight from storage through our own
// authenticated route — never a signed S3/MinIO URL. PDF is fed to
// pdf.js and painted onto <canvas> (see MaterialPreview) so the
// browser's native PDF plugin, with its own print/download/save
// controls, never gets involved. Video is proxied so no directly
// shareable link ever reaches the DOM; the Range header is passed
// through so <video> seeking still works. Session-gated only, same as
// /preview — not a public download link.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 })
  }

  const version = await prisma.materialVersion.findUnique({
    where:  { id: params.versionId },
    select: { materialId: true, fileUrl: true, fileType: true },
  })

  if (!version || version.materialId !== params.id) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  if (version.fileType === 'PDF') {
    const buffer = await getFileBuffer(version.fileUrl)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control':       'no-store',
      },
    })
  }

  if (version.fileType === 'VIDEO') {
    const range  = req.headers.get('range') ?? undefined
    const object = await getObjectStream(version.fileUrl, range)

    const headers: Record<string, string> = {
      'Content-Type':        object.contentType ?? 'video/mp4',
      'Content-Disposition': 'inline',
      'Cache-Control':       'no-store',
      'Accept-Ranges':       'bytes',
    }
    if (object.contentLength !== undefined) headers['Content-Length'] = String(object.contentLength)
    if (object.contentRange)                headers['Content-Range']  = object.contentRange

    const webStream = Readable.toWeb(object.body) as ReadableStream

    return new NextResponse(webStream, {
      status:  object.partial ? 206 : 200,
      headers,
    })
  }

  return NextResponse.json({ message: 'Not found' }, { status: 404 })
}
