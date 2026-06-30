'use client'

import { usePathname } from 'next/navigation'
import { NavIcon }     from './NavIcon'
import { NAV_ITEMS }   from '@/lib/navigation'

interface Props {
  user: {
    name:     string
    unitName: string
  }
}

export function TopBar({ user }: Props) {
  const pathname = usePathname()

  // Find current page label from nav items
  const currentItem = NAV_ITEMS.find((item) => {
    if (item.href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(item.href)
  })

  // Build breadcrumb
  const segments = pathname.split('/').filter(Boolean)
  const isDetail = segments.length > 1

  return (
    <header
      className="h-14 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-30"
      style={{
        background:  '#fff',
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

      {/* Right — unit + notifications */}
      <div className="flex items-center gap-4">
        <span
          className="text-xs px-2.5 py-1 rounded-full font-medium hidden sm:block"
          style={{ background: '#f0fdf4', color: '#166534' }}
        >
          {user.unitName}
        </span>

        {/* Notification bell — wired in Chunk 12 */}
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative"
          style={{ color: '#6b7280' }}
          title="Notifications (coming in Chunk 12)"
        >
          <NavIcon name="bell" size={18} />
        </button>
      </div>
    </header>
  )
}