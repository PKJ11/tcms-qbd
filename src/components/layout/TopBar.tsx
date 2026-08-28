'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS }   from '@/lib/navigation'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import type { TCMSUser } from '@/lib/types'

interface Props {
  user: Partial<TCMSUser> & { name: string }
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
        <UserMenu user={user} />

        {/* Real notification bell */}
        <NotificationBell />
      </div>
    </header>
  )
}

function UserMenu({ user }: Props) {
  const [open, setOpen]     = useState(false)
  const [pinned, setPinned] = useState(false)
  const wrapRef             = useRef<HTMLDivElement>(null)
  const closeTimer          = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close the pinned panel on outside click / Escape
  useEffect(() => {
    if (!pinned) return

    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setPinned(false)
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPinned(false)
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [pinned])

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  function handleEnter() {
    clearCloseTimer()
    setOpen(true)
  }

  function handleLeave() {
    if (pinned) return
    clearCloseTimer()
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  function handleClick() {
    setPinned((p) => {
      const next = !p
      setOpen(next)
      return next
    })
  }

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  const department = user.department
    ? user.departmentCode
      ? `${user.department} (${user.departmentCode})`
      : user.department
    : null

  const rows: Array<[string, string | null | undefined]> = [
    ['Employee ID', user.employeeId],
    ['Email',       user.email],
    ['Department',  department],
    ['Unit',        user.unit],
    ['Section',     user.section],
  ]

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-2 text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
        style={{
          background: open ? '#dcfce7' : '#f0fdf4',
          color:      '#166534',
        }}
      >
        <span
          className="flex items-center justify-center rounded-full font-semibold"
          style={{ width: 20, height: 20, background: '#166534', color: '#fff', fontSize: 10 }}
        >
          {initials}
        </span>
        {user.name}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-lg overflow-hidden z-40"
          style={{
            background:   '#fff',
            border:       '1px solid #e5e7eb',
            boxShadow:    '0 10px 25px -5px rgba(0,0,0,.15), 0 8px 10px -6px rgba(0,0,0,.1)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ background: '#f0fdf4', borderBottom: '1px solid #e5e7eb' }}
          >
            <span
              className="flex items-center justify-center rounded-full font-semibold flex-shrink-0"
              style={{ width: 36, height: 36, background: '#166534', color: '#fff', fontSize: 14 }}
            >
              {initials}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{user.name}</div>
              {user.roles && user.roles.length > 0 && (
                <div className="text-[11px] text-gray-500 truncate">
                  {user.roles.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <dl className="px-4 py-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 py-1.5 text-xs">
                <dt className="text-gray-500 flex-shrink-0">{label}</dt>
                <dd className="text-gray-900 font-medium text-right break-all">
                  {value || '—'}
                </dd>
              </div>
            ))}
          </dl>

          {typeof user.passwordDaysRemaining === 'number' && (
            <div
              className="px-4 py-2 text-[11px] text-gray-500"
              style={{ borderTop: '1px solid #f3f4f6' }}
            >
              Password expires in {user.passwordDaysRemaining} day
              {user.passwordDaysRemaining === 1 ? '' : 's'}
            </div>
          )}

          <a
            href="/change-password"
            className="block px-4 py-2.5 text-xs font-medium text-center transition-colors hover:bg-gray-50"
            style={{ borderTop: '1px solid #e5e7eb', color: '#166534' }}
          >
            Change password
          </a>
        </div>
      )}
    </div>
  )
}
