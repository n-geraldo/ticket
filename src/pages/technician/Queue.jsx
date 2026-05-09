import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTickets } from '../../data/api'
import { StatusBadge, TypeBadge } from '../../components/Badge'
import PriorityBar from '../../components/PriorityBar'
import { useAuth } from '../../contexts/AuthContext'
import NotificationBell from '../../components/NotificationBell'

const BOTTOM_NAV = [
  { icon: '☰',  label: 'Tickets',  path: '/mobile',          active: true },
  { icon: '🗺', label: 'Map',      path: '/mobile/map' },
  { icon: '📅', label: 'Schedule', path: '/mobile/schedule' },
  { icon: '⚙', label: 'Settings' },
]

function MobileFrame({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  )
}

export default function TechQueue() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    getTickets().then(setTickets).catch(console.error).finally(() => setLoading(false))
  }, [])

  const myTickets = tickets
  const list = tickets

  return (
    <MobileFrame>
      <div style={{ background: '#1a1a2e', padding: '12px 16px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: '#4a9eff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 700, flexShrink: 0 }}>{user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{user?.name}</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>FIELD TECHNICIAN</div>
          </div>
          <NotificationBell compact />
          <div style={{ marginLeft: 'auto' }}><span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#27ae60' }}>● ONLINE</span></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[{ label: 'My tickets', val: myTickets.length, color: '#4a9eff' }, { label: 'Due today', val: myTickets.filter(t => t.status !== 'closed').length, color: '#e67e22' }].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderBottom: '2px solid #1a6eb5', flexShrink: 0, padding: '12px 16px', fontSize: 14, fontWeight: 700, color: '#1a6eb5' }}>
        My Queue
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
        {loading && <div style={{ padding: 32, textAlign: 'center', color: '#bbb', fontSize: 14 }}>Loading…</div>}
        {!loading && list.map(t => (
          <div key={t.id} onClick={() => navigate(`/mobile/ticket/${t.id}`)}
            style={{ background: '#fff', borderRadius: 10, marginBottom: 10, padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', gap: 10, alignItems: 'stretch', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.11)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.07)'}
          >
            <PriorityBar priority={t.priority} />
            <div style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#1a6eb5', fontWeight: 700 }}>#{t.id}</span>
                <TypeBadge type={t.type} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.client}</div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <StatusBadge status={t.status} />
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#bbb' }}>{t.time}</span>
              </div>
            </div>
          </div>
        ))}
        {!loading && list.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#bbb', fontSize: 14 }}>No tickets</div>}
      </div>

      <div style={{ height: 60, background: '#fff', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexShrink: 0 }}>
        {BOTTOM_NAV.map(n => (
          <button key={n.label} onClick={() => n.path && navigate(n.path)} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '4px 12px' }}>
            <div style={{ fontSize: 20 }}>{n.icon}</div>
            <div style={{ fontSize: 10, color: n.active ? '#1a6eb5' : '#aaa', fontWeight: n.active ? 700 : 400 }}>{n.label}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexShrink: 0 }}>
        {(user?.role === 'admin' || user?.role === 'operator') && (
          <button onClick={() => navigate('/operator')} style={{ flex: 1, background: 'rgba(26,26,46,0.06)', border: 'none', padding: '8px', fontSize: 11, color: '#999', cursor: 'pointer', textAlign: 'center' }}>
            🖥 Operator View
          </button>
        )}
        <button onClick={() => { logout(); navigate('/login') }} style={{ flex: 1, background: 'rgba(26,26,46,0.04)', border: 'none', borderLeft: '1px solid rgba(0,0,0,0.06)', padding: '8px', fontSize: 11, color: '#bbb', cursor: 'pointer', textAlign: 'center' }}>
          Sign out
        </button>
      </div>
    </MobileFrame>
  )
}
