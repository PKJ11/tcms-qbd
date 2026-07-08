'use client'

import { useState }    from 'react'
import { usePathname } from 'next/navigation'
import { signOut }     from 'next-auth/react'
import { NavIcon }     from './NavIcon'
import {
  getNavItemsForRole,
  ROLE_LABELS,
  ROLE_COLORS,
} from '@/lib/navigation'
import type { UserRole } from '@/lib/types'
import { useAutoLogoutAudit } from '@/hooks/useAutoLogoutAudit'

interface Props {
  user: {
    name:       string
    email:      string
    role:       UserRole
    unitName:   string
    department: string | null
  }
}

export function Sidebar({ user }: Props) {
  useAutoLogoutAudit()
  const pathname          = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems  = getNavItemsForRole(user.role)
  const roleLabel = ROLE_LABELS[user.role]
  const roleStyle = ROLE_COLORS[user.role]

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  async function handleLogout() {
  try {
    await fetch('/api/auth/logout-audit', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type: 'manual' }),
    })
  } catch {
    // never block logout due to audit failure
  }
  await signOut({ callbackUrl: '/login' })
}

  const sidebarContent = (
    <div
      className="flex flex-col h-full"
      style={{ background: '#1a3a2a' }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-between px-4 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: '#2d6a4f', color: '#fff' }}
          >
            QbD
          </div>
          {!collapsed && (
            <div>
              <div className="text-white text-sm font-semibold leading-tight">
                TCMS
              </div>
              <div className="text-xs" style={{ color: '#74c69d' }}>
                v0.1
              </div>
            </div>
          )}
        </div>

        {/* Collapse button — desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex text-gray-400 hover:text-white transition-colors"
        >
          <NavIcon name={collapsed ? 'menu' : 'x'} size={16} />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="flex flex-col gap-0.5 px-2">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group"
                style={{
                  background: active
                    ? 'rgba(45,106,79,0.6)'
                    : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLElement).style.background =
                      'rgba(255,255,255,0.06)'
                }}
                onMouseLeave={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLElement).style.background =
                      'transparent'
                }}
              >
                <NavIcon
                  name={item.icon}
                  size={17}
                  color={active ? '#74c69d' : 'rgba(255,255,255,0.5)'}
                />
                {!collapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
                {active && !collapsed && (
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: '#74c69d' }}
                  />
                )}
              </a>
            )
          })}
        </div>
      </nav>

      {/* User section */}
      <div
        className="p-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        {!collapsed && (
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: '#2d6a4f', color: '#fff' }}
            >
              {user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">
                {user.name}
              </div>
              <span
                className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={roleStyle}
              >
                {roleLabel}
              </span>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background =
              'rgba(239,68,68,0.15)'
            ;(e.currentTarget as HTMLElement).style.color = '#fca5a5'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color =
              'rgba(255,255,255,0.5)'
          }}
        >
          <NavIcon name="logout" size={17} />
          {!collapsed && (
            <span className="text-sm font-medium">Sign out</span>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col h-screen sticky top-0 flex-shrink-0 transition-all duration-200"
        style={{ width: collapsed ? '64px' : '220px' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ background: '#1a3a2a', color: '#fff' }}
      >
        <NavIcon name="menu" size={18} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          onClick={() => setMobileOpen(false)}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          />

          {/* Drawer */}
          <aside
            className="relative w-64 h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}