import { NextResponse }          from 'next/server'
import { scanAndNotifyOverdue }  from '@/modules/notifications'

// This can be called by:
// 1. A cron job service (e.g. Vercel Cron, GitHub Actions)
// 2. A scheduled task on the server
// 3. Manually by the Training Head from the admin panel

export async function POST() {
  try {
    const result = await scanAndNotifyOverdue()
    return NextResponse.json({
      message: 'Scan complete',
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scan failed'
    return NextResponse.json({ message }, { status: 500 })
  }
}