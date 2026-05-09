import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAppNotifications, markAllNotificationsRead, markNotificationRead } from '../data/api'

function shortTime(value) {
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export default function NotificationBell({ compact = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])

  const unread = useMemo(() => items.filter(n => !n.read).length, [items])

  const load = () => {
    getAppNotifications()
      .then(setItems)
      .catch(() => {})
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 15000)
    return () => clearInterval(timer)
  }, [])

  const ticketPath = (ticketId) => {
    if (!ticketId) return null
    if (location.pathname.startsWith('/mobile')) return `/mobile/ticket/${ticketId}`
    if (location.pathname.startsWith('/m')) return `/m/ticket/${ticketId}`
    return `/operator/ticket/${ticketId}`
  }

  const openNotification = async (notification) => {
    setItems(ns => ns.map(n => n.id === notification.id ? { ...n, read: true } : n))
    setOpen(false)
    markNotificationRead(notification.id).catch(() => {})
    const path = ticketPath(notification.ticket_id)
    if (path) navigate(path)
  }

  const markAll = async () => {
    setItems(ns => ns.map(n => ({ ...n, read: true })))
    await markAllNotificationsRead().catch(() => {})
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        title="Notifications"
        style={{
          position: 'relative',
          background: compact ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)',
          border: compact ? 'none' : '1px solid rgba(255,255,255,0.14)',
          borderRadius: 6,
          color: '#fff',
          cursor: 'pointer',
          width: compact ? 34 : 36,
          height: compact ? 32 : 30,
          fontSize: 16,
        }}>
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16,
            borderRadius: 8, background: '#e74c3c', color: '#fff',
            fontSize: 10, fontWeight: 700, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '0 4px',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: compact ? 38 : 36, width: 340,
          maxWidth: 'calc(100vw - 24px)', background: '#fff',
          border: '1px solid #e8e8e8', borderRadius: 8,
          boxShadow: '0 12px 32px rgba(0,0,0,0.18)', zIndex: 50,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>Notifications</div>
            <div style={{ flex: 1 }} />
            {unread > 0 && (
              <button onClick={markAll} style={{ background: 'none', border: 'none', color: '#1a6eb5', fontSize: 12, cursor: 'pointer' }}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: 360, overflow: 'auto' }}>
            {items.length === 0 && (
              <div style={{ padding: 22, textAlign: 'center', color: '#aaa', fontSize: 13 }}>No notifications</div>
            )}
            {items.map(n => (
              <button
                key={n.id}
                onClick={() => openNotification(n)}
                style={{
                  width: '100%', border: 'none', borderBottom: '1px solid #f5f5f5',
                  background: n.read ? '#fff' : '#f0f6ff', cursor: 'pointer',
                  textAlign: 'left', padding: '11px 12px', display: 'flex', gap: 10,
                }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: n.read ? '#ddd' : '#1a6eb5', marginTop: 5, flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', flex: 1 }}>{n.title}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#aaa', fontSize: 10 }}>{shortTime(n.createdAt)}</div>
                  </div>
                  <div style={{ color: '#666', fontSize: 12, lineHeight: 1.35, marginTop: 3 }}>{n.message}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
