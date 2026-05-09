import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTickets } from '../../data/api'
import { useAuth } from '../../contexts/AuthContext'

const STATUS_STYLE = {
  closed: { color: '#2a7a3b', bg: '#e8f5eb', label: 'Done' },
  inprog: { color: '#b56a00', bg: '#fdf2e3', label: 'In Progress' },
  open:   { color: '#888',    bg: '#f5f5f5', label: 'Upcoming' },
}

const TYPE_ICON = { install: '📡', problem: '⚠️' }
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const BOTTOM_NAV = [
  { icon: '☰',  label: 'Tickets',  path: '/mobile' },
  { icon: '🗺', label: 'Map',      path: '/mobile/map' },
  { icon: '📅', label: 'Schedule', path: '/mobile/schedule', active: true },
  { icon: '⚙', label: 'Settings' },
]

function getWeekDays() {
  const today = new Date()
  const dow = today.getDay() // 0=Sun
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatHeaderDate(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function slotTime(ticket) {
  if (ticket.estimatedVisit) return ticket.estimatedVisit
  return '—'
}

export default function Schedule() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const weekDays = getWeekDays()
  const todayIndex = weekDays.findIndex(d => d.toDateString() === today.toDateString())

  useEffect(() => {
    getTickets()
      .then(setTickets)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: '#1a1a2e', padding: '16px 20px 20px', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: '#fff', marginBottom: 2 }}>My Schedule</div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
          {formatHeaderDate(today)} · {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
        </div>

        {/* Day strip */}
        <div style={{ display: 'flex', gap: 6 }}>
          {weekDays.map((d, i) => {
            const isToday = i === todayIndex
            return (
              <div key={i} style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 8, background: isToday ? '#4a9eff' : 'rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', color: isToday ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                  {DAY_LETTERS[i]}
                </div>
                <div style={{ fontSize: 14, fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : 'rgba(255,255,255,0.5)', marginTop: 3 }}>
                  {d.getDate()}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 0' }}>
        {loading && (
          <div style={{ padding: 40, textAlign: 'center', color: '#bbb', fontSize: 14 }}>Loading…</div>
        )}

        {!loading && tickets.map((t, i) => {
          const st = STATUS_STYLE[t.status] || STATUS_STYLE.open
          const isLast = i === tickets.length - 1
          return (
            <div key={t.id} style={{ display: 'flex', gap: 0, margin: '0 16px 0', position: 'relative' }}>
              {/* Time column */}
              <div style={{ width: 60, flexShrink: 0, paddingTop: 14, textAlign: 'right', paddingRight: 14 }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#aaa', whiteSpace: 'nowrap' }}>
                  {slotTime(t)}
                </div>
              </div>

              {/* Timeline line + dot */}
              <div style={{ width: 2, background: isLast ? 'transparent' : '#e0e0e0', flexShrink: 0, position: 'relative' }}>
                <div style={{
                  width: 12, height: 12, borderRadius: 6,
                  background: t.status === 'closed' ? '#27ae60' : t.status === 'inprog' ? '#e67e22' : '#d0d0d0',
                  border: '2px solid #f5f5f5',
                  position: 'absolute', top: 16, left: -5,
                  boxShadow: '0 0 0 2px ' + (t.status === 'inprog' ? '#e67e22' : t.status === 'closed' ? '#27ae60' : '#d0d0d0'),
                }} />
              </div>

              {/* Card */}
              <div style={{ flex: 1, marginLeft: 14, marginBottom: 14, background: '#fff', borderRadius: 10, padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', opacity: t.status === 'closed' ? 0.65 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 15 }}>{TYPE_ICON[t.type] || '🔧'}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#aaa' }}>#{t.id}</span>
                  </div>
                  <div style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: st.bg, color: st.color, fontWeight: 600 }}>
                    {st.label}
                  </div>
                </div>

                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.client}
                </div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.description}
                </div>

                {t.address && (
                  <div style={{ fontSize: 12, color: '#aaa', marginBottom: 10 }}>📍 {t.address}</div>
                )}

                {t.status !== 'closed' && (
                  <button onClick={() => navigate(`/mobile/ticket/${t.id}`)}
                    style={{ background: t.status === 'inprog' ? '#1a1a2e' : 'transparent', color: t.status === 'inprog' ? '#fff' : '#1a1a2e', border: '1.5px solid #1a1a2e', borderRadius: 7, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {t.status === 'inprog' ? 'View Ticket' : 'Start'}
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {!loading && tickets.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#bbb', fontSize: 14 }}>No tickets scheduled today</div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ height: 60, background: '#fff', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexShrink: 0 }}>
        {BOTTOM_NAV.map(n => (
          <button key={n.label} onClick={() => n.path && navigate(n.path)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '4px 12px' }}>
            <div style={{ fontSize: 20 }}>{n.icon}</div>
            <div style={{ fontSize: 10, color: n.active ? '#1a6eb5' : '#aaa', fontWeight: n.active ? 700 : 400 }}>{n.label}</div>
          </button>
        ))}
      </div>

      {(user?.role === 'admin' || user?.role === 'operator') && (
        <button onClick={() => navigate('/operator')} style={{ background: 'rgba(26,26,46,0.06)', border: 'none', padding: '8px', fontSize: 11, color: '#999', cursor: 'pointer', textAlign: 'center', flexShrink: 0 }}>
          🖥 Switch to Operator View
        </button>
      )}
    </div>
  )
}
