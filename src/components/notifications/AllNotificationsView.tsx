'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDateTime } from '@/lib/utils'

interface Notification {
  id:      string
  type:    string
  title:   string
  message: string
  isRead:  boolean
  sentAt:  string
  readAt:  string | null
}

const TYPE_STYLES: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  ASSIGNMENT:           { label: 'Assignment',    bg: '#eff6ff', color: '#1d4ed8', icon: '📋' },
  DUE_SOON:            { label: 'Due soon',      bg: '#fefce8', color: '#854d0e', icon: '⏰' },
  OVERDUE:             { label: 'Overdue',       bg: '#fef2f2', color: '#dc2626', icon: '🚨' },
  FAILED:              { label: 'Failed',        bg: '#fef2f2', color: '#dc2626', icon: '❌' },
  RETRAINING:          { label: 'Retraining',    bg: '#fff7ed', color: '#c2410c', icon: '🔄' },
  QUALIFICATION_EXPIRY: { label: 'Expiry',        bg: '#fefce8', color: '#854d0e', icon: '⚠️' },
  PASSWORD_RESET:       { label: 'Password',      bg: '#f5f3ff', color: '#6d28d9', icon: '🔑' },
}

export function AllNotificationsView() {
  const [notifications, setNotifications]   = useState<Notification[]>([])
  const [loading,        setLoading]        = useState(true)
  const [typeFilter,     setTypeFilter]     = useState('')
  const [readFilter,     setReadFilter]     = useState('')

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/notifications')
    const data = await res.json()
    setNotifications(data.notifications ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  async function handleMarkRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
    )
  }

  async function handleMarkAllRead() {
    await fetch('/api/notifications', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'markAllRead' }),
    })
    setNotifications((prev) => prev.map((n) => ({
      ...n,
      isRead: true,
      readAt: new Date().toISOString(),
    })))
  }

  const filtered = notifications.filter((n) => {
    if (typeFilter && n.type !== typeFilter) return false
    if (readFilter === 'unread' && n.isRead)  return false
    if (readFilter === 'read'   && !n.isRead) return false
    return true
  })

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <>
      {/* Filters */}
      <div
        className="bg-white rounded-xl border p-4 mb-4 flex flex-wrap gap-3"
        style={{ borderColor: '#e5e7eb' }}
      >
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="">All types</option>
          {Object.entries(TYPE_STYLES).map(([key, style]) => (
            <option key={key} value={key}>{style.label}</option>
          ))}
        </select>

        <select
          value={readFilter}
          onChange={(e) => setReadFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="">All</option>
          <option value="unread">Unread only</option>
          <option value="read">Read only</option>
        </select>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
            {unreadCount > 0 && ` · ${unreadCount} unread`}
          </span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-medium"
              style={{ color: '#2d6a4f' }}
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Loading notifications...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <p className="text-sm text-gray-400">No notifications found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((n) => {
            const style = TYPE_STYLES[n.type] ?? TYPE_STYLES.ASSIGNMENT
            return (
              <div
                key={n.id}
                className="bg-white rounded-xl border p-4 flex items-start gap-4 transition-all"
                style={{
                  borderColor: n.isRead ? '#e5e7eb' : '#bbf7d0',
                  background:  n.isRead ? '#fff'    : '#f0fdf4',
                }}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: style.bg }}
                >
                  {style.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium mr-2"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {style.label}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {n.title}
                      </span>
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="text-xs font-medium flex-shrink-0"
                        style={{ color: '#2d6a4f' }}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    {n.message}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">
                      {formatDateTime(n.sentAt)}
                    </span>
                    {n.readAt && (
                      <span className="text-xs text-gray-300">
                        Read {formatDateTime(n.readAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}