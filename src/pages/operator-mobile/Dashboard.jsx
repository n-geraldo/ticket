import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTickets } from '../../data/api'
import { StatusBadge, TypeBadge } from '../../components/Badge'
import PriorityBar from '../../components/PriorityBar'
import { useAuth } from '../../contexts/AuthContext'
import BottomNav from './BottomNav'
import NotificationBell from '../../components/NotificationBell'

const FILTERS = ['All', 'Open', 'In Progress', 'Closed']
const FILTER_MAP = { All: null, Open: 'open', 'In Progress': 'inprog', Closed: 'closed' }

export default function MobileDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getTickets().then(setTickets).catch(console.error).finally(() => setLoading(false))
  }, [])

  const statusFilter = FILTER_MAP[filter]
  const list = tickets
    .filter(t => !statusFilter || t.status === statusFilter)
    .filter(t => !search.trim() ||
      t.client.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      String(t.id).includes(search)
    )

  const open   = tickets.filter(t => t.status === 'open').length
  const inprog = tickets.filter(t => t.status === 'inprog').length
  const closed = tickets.filter(t => t.status === 'closed').length

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: '#1a1a2e', padding: '14px 16px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: '#1a6eb5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
            {user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{user?.name}</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{user?.role?.toUpperCase()}</div>
          </div>
          <button onClick={() => { logout(); navigate('/login') }}
            style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, padding: '6px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer' }}>
            Sign out
          </button>
          <NotificationBell compact />
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Open',        val: open,   color: '#4a9eff' },
            { label: 'In Progress', val: inprog, color: '#e67e22' },
            { label: 'Closed',      val: closed, color: '#27ae60' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search + filters */}
      <div style={{ padding: '12px 14px 0', flexShrink: 0 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by client, description, or ID…"
          style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#333', outline: 'none', fontFamily: 'inherit', background: '#fff' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '10px 14px', flexShrink: 0, overflowX: 'auto' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ flexShrink: 0, border: `1.5px solid ${filter === f ? '#1a6eb5' : '#e2e8f0'}`, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: filter === f ? 700 : 400, color: filter === f ? '#1a6eb5' : '#888', background: filter === f ? '#e8f0fb' : '#fff', cursor: 'pointer' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 8px' }}>
        {loading && <div style={{ padding: 40, textAlign: 'center', color: '#bbb', fontSize: 14 }}>Loading…</div>}
        {!loading && list.map(t => (
          <div key={t.id} onClick={() => navigate(`/m/ticket/${t.id}`)}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {t.agent && <span style={{ fontSize: 11, color: '#aaa' }}>{t.agent}</span>}
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#bbb' }}>{t.time}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!loading && list.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#bbb', fontSize: 14 }}>No tickets found</div>
        )}
      </div>

      <BottomNav active="tickets" />
    </div>
  )
}
