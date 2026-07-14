'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDateTime } from '@/lib/utils'

interface Notification {
  id:      string
  type:    string
  title:   string
  message: string
  isRead:  boolean
  sentAt:  string
}

const TYPE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  ASSIGNMENT:           { icon: '📋', color: '#1d4ed8', bg: '#eff6ff' },
  DUE_SOON:            { icon: '⏰', color: '#854d0e', bg: '#fefce8' },
  OVERDUE:             { icon: '🚨', color: '#dc2626', bg: '#fef2f2' },
  FAILED:              { icon: '❌', color: '#dc2626', bg: '#fef2f2' },
  RETRAINING:          { icon: '🔄', color: '#c2410c', bg: '#fff7ed' },
  QUALIFICATION_EXPIRY: { icon: '⚠️', color: '#854d0e', bg: '#fefce8' },
  PASSWORD_RESET:       { icon: '🔑', color: '#6d28d9', bg: '#f5f3ff' },
  DOCUMENT_UPDATED:     { icon: '📄', color: '#1d4ed8', bg: '#eff6ff' },
}

export function NotificationBell() {
  const [open,        setOpen]        = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading,     setLoading]     = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    const res  = await fetch('/api/notifications')
    const data = await res.json()
    setNotifications(data.notifications ?? [])
    setUnreadCount(data.unreadCount ?? 0)
  }, [])

  // Poll every 30 seconds for new notifications
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function handleMarkRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, isRead: true } : n)
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  async function handleMarkAllRead() {
    setLoading(true)
    await fetch('/api/notifications', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'markAllRead' }),
    })
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    setLoading(false)
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
        style={{
          background: open ? '#f0fdf4' : 'transparent',
          color:      '#6b7280',
        }}
      >
        <svg
          width="18" height="18"
          viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
        >
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <div
            className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white px-1"
            style={{ background: '#dc2626', fontSize: '10px' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl shadow-xl border overflow-hidden"
          style={{
            width:       '380px',
            background:  '#fff',
            borderColor: '#e5e7eb',
            zIndex:      100,
          }}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid #f3f4f6' }}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-xs font-semibold text-white"
                  style={{ background: '#dc2626' }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-xs font-medium disabled:opacity-40"
                style={{ color: '#2d6a4f' }}
              >
                {loading ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto" style={{ maxHeight: '420px' }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <svg
                  width="32" height="32"
                  viewBox="0 0 24 24" fill="none"
                  stroke="#d1d5db" strokeWidth="1.5"
                >
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const style = TYPE_ICONS[n.type] ?? TYPE_ICONS.ASSIGNMENT

                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                    style={{
                      background:   n.isRead ? '#fff' : '#f0fdf4',
                      borderBottom: '1px solid #f9fafb',
                    }}
                    onClick={() => !n.isRead && handleMarkRead(n.id)}
                  >
                    {/* Icon */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base"
                      style={{ background: style.bg }}
                    >
                      {style.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-xs font-semibold text-gray-900 leading-tight"
                          style={{ color: n.isRead ? '#374151' : '#111827' }}
                        >
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                            style={{ background: '#2d6a4f' }}
                          />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {n.message}
                      </p>
                      <p className="text-xs text-gray-300 mt-1">
                        {formatDateTime(n.sentAt)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Panel footer */}
          {notifications.length > 0 && (
            <div
              className="px-4 py-2.5 text-center"
              style={{ borderTop: '1px solid #f3f4f6' }}
            >
              <button
                onClick={() => {
                  setOpen(false)
                  fetchNotifications()
                }}
                className="text-xs font-medium"
                style={{ color: '#2d6a4f' }}
              >
                Refresh notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}