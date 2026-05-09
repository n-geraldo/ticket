import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTickets, getTechnicians, getReports } from '../../data/api'
import { StatusBadge, TypeBadge } from '../../components/Badge'
import PriorityBar from '../../components/PriorityBar'
import TopNav from '../../components/TopNav'

const FILTERS = [
  { label: 'All Tickets', type: 'item' },
  { label: 'My Queue',    type: 'item' },
  { label: 'Unassigned',  type: 'item' },
  { label: 'Status',      type: 'header' },
  { label: 'Open',        type: 'item' },
  { label: 'In Progress', type: 'item' },
  { label: 'Closed',      type: 'item' },
  { label: 'Type',        type: 'header' },
  { label: 'Problems',    type: 'item' },
  { label: 'Installations', type: 'item' },
]

const COLS = '4px 72px 100px 116px 1fr 90px 72px'

export default function Dashboard() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilter, setActiveFilter] = useState('All Tickets')
  const [search, setSearch] = useState('')
  const [avgResolution, setAvgResolution] = useState('')

  useEffect(() => {
    Promise.all([getTickets(), getTechnicians(), getReports()])
      .then(([t, tech, reports]) => { setTickets(t); setTechnicians(tech); setAvgResolution(reports.avgResolution) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'inprog').length,
    closedToday: tickets.filter(t => t.status === 'closed').length,
    avgResolution,
  }

  const statCards = [
    { label: 'Open',           val: stats.open,          color: '#1a6eb5' },
    { label: 'In Progress',    val: stats.inProgress,    color: '#b56a00' },
    { label: 'Closed Today',   val: stats.closedToday,   color: '#2a7a3b' },
    { label: 'Avg. Resolution',val: stats.avgResolution, color: '#555' },
  ]

  const filtered = tickets.filter(t => {
    if (search) {
      const q = search.toLowerCase()
      return t.client.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.id.includes(q)
    }
    const map = {
      'Open':          () => t.status === 'open',
      'In Progress':   () => t.status === 'inprog',
      'Closed':        () => t.status === 'closed',
      'Problems':      () => t.type === 'problem',
      'Installations': () => t.type === 'install',
      'Unassigned':    () => !t.agent,
    }
    return map[activeFilter] ? map[activeFilter]() : true
  })

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <TopNav />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: 196, borderRight: '1px solid #e8e8e8', background: '#fff', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <div style={{ padding: '14px 16px 6px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Filters</div>
          {FILTERS.map((item, i) =>
            item.type === 'header'
              ? <div key={i} style={{ padding: '12px 16px 4px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</div>
              : <button key={i} onClick={() => setActiveFilter(item.label)} style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '6px 16px', fontSize: 13,
                  color: activeFilter === item.label ? '#1a1a2e' : '#666',
                  background: activeFilter === item.label ? '#e8f0fb' : 'transparent',
                  fontWeight: activeFilter === item.label ? 600 : 400, border: 'none',
                  borderRight: activeFilter === item.label ? '3px solid #1a6eb5' : '3px solid transparent', cursor: 'pointer',
                }}>{item.label}</button>
          )}
          <div style={{ margin: '12px 0', borderTop: '1px solid #f0f0f0' }} />
          <div style={{ padding: '0 16px 8px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Technicians</div>
          {technicians.map(t => (
            <div key={t.id} style={{ padding: '5px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: 4, background: t.status === 'online' ? '#27ae60' : '#f39c12', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#555' }}>{t.name}</span>
            </div>
          ))}
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Stats bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8', background: '#fff', flexShrink: 0 }}>
            {statCards.map((s, i) => (
              <div key={i} style={{ flex: 1, padding: '12px 20px', borderRight: i < 3 ? '1px solid #f0f0f0' : 'none' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#aaa', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, flexShrink: 0 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..."
                style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 12px', fontSize: 13, width: 180, outline: 'none', background: '#fafafa', color: '#1a1a2e' }} />
              <button onClick={() => navigate('/operator/new')}
                style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                + New Ticket
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: COLS, alignItems: 'center', padding: '0 16px', height: 32, borderBottom: '1px solid #f0f0f0', background: '#fafafa', position: 'sticky', top: 0, zIndex: 1 }}>
              {['', 'ID', 'TYPE', 'STATUS', 'DESCRIPTION', 'AGENT', 'TIME'].map((h, i) => (
                <div key={i} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px' }}>{h}</div>
              ))}
            </div>

            {loading && <div style={{ padding: 48, textAlign: 'center', color: '#aaa', fontSize: 14 }}>Loading…</div>}
            {error  && <div style={{ padding: 48, textAlign: 'center', color: '#e74c3c', fontSize: 14 }}>Error: {error}</div>}

            {!loading && !error && filtered.map(t => (
              <div key={t.id} onClick={() => navigate(`/operator/ticket/${t.id}`)}
                style={{ display: 'grid', gridTemplateColumns: COLS, alignItems: 'center', padding: '0 16px', height: 56, borderBottom: '1px solid #f5f5f5', background: t.status === 'inprog' ? '#f0f6ff' : '#fff', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f4fa'}
                onMouseLeave={e => e.currentTarget.style.background = t.status === 'inprog' ? '#f0f6ff' : '#fff'}
              >
                <div style={{ display: 'flex', alignSelf: 'stretch', alignItems: 'stretch', padding: '8px 0' }}>
                  <PriorityBar priority={t.priority} />
                </div>
                <div style={{ padding: '0 8px', fontSize: 13, color: '#1a6eb5', fontWeight: 700 }}>#{t.id}</div>
                <div style={{ padding: '0 8px' }}><TypeBadge type={t.type} /></div>
                <div style={{ padding: '0 8px' }}><StatusBadge status={t.status} /></div>
                <div style={{ padding: '0 8px', minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.client}</div>
                  <div style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description}</div>
                </div>
                <div style={{ padding: '0 8px', fontSize: 13, color: '#555' }}>{t.agent || '—'}</div>
                <div style={{ padding: '0 8px', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: '#aaa' }}>{t.time}</div>
              </div>
            ))}

            {!loading && !error && filtered.length === 0 && (
              <div style={{ padding: 48, textAlign: 'center', color: '#aaa', fontSize: 14 }}>No tickets found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
