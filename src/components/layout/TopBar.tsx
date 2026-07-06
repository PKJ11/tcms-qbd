'use client'

import { usePathname } from 'next/navigation'
import { NAV_ITEMS }   from '@/lib/navigation'
import { NotificationBell } from '@/components/notifications/NotificationBell'

interface Props {
  user: {
    name:     string
    unitName: string
  }
}

export function TopBar({ user }: Props) {
  const pathname = usePathname()

  const currentItem = NAV_ITEMS.find((item) => {
    if (item.href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(item.href)
  })

  const segments = pathname.split('/').filter(Boolean)
  const isDetail = segments.length > 1

  return (
    <header
      className="h-14 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-30"
      style={{
        background:   '#fff',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      {/* Left — breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-gray-800">
          {currentItem?.label ?? 'TCMS'}
        </span>
        {isDetail && (
          <>
            <span className="text-gray-300">/</span>
            <span className="text-gray-500 capitalize">
              {segments[segments.length - 1]?.replace(/-/g, ' ')}
            </span>
          </>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <span
          className="text-xs px-2.5 py-1 rounded-full font-medium hidden sm:block"
          style={{ background: '#f0fdf4', color: '#166534' }}
        >
          {user.unitName}
        </span>

        {/* Real notification bell */}
        <NotificationBell />
      </div>
    </header>
  )
}