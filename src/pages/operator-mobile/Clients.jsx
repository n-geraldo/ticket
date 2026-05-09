import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClients, createTicket } from '../../data/api'
import BottomNav from './BottomNav'

const STATUS_STYLE = {
  active:    { color: '#2a7a3b', bg: '#e8f5eb', label: 'Active' },
  suspended: { color: '#b56a00', bg: '#fdf2e3', label: 'Suspended' },
  inactive:  { color: '#888',    bg: '#f5f5f5', label: 'Inactive' },
  expired:   { color: '#9b2c2c', bg: '#fde8e8', label: 'Expired' },
}
const MAX_VISIBLE_CLIENTS = 100

export default function MobileClients() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    getClients().then(setClients).catch(console.error).finally(() => setLoading(false))
  }, [])

  const list = clients.filter(c =>
    !search.trim() ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.ref || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  )
  const visibleList = list.slice(0, MAX_VISIBLE_CLIENTS)
  const hiddenClientCount = Math.max(0, list.length - visibleList.length)

  const toggle = (id) => setExpanded(prev => prev === id ? null : id)

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: '#1a1a2e', padding: '14px 16px 16px', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: '#fff', marginBottom: 12 }}>Clients</div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, reference, or phone…"
          style={{ width: '100%', boxSizing: 'border-box', border: 'none', borderRadius: 8, padding: '10px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', background: 'rgba(255,255,255,0.12)', color: '#fff' }}
        />
      </div>

      {/* Count */}
      <div style={{ padding: '10px 16px 4px', flexShrink: 0 }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#aaa' }}>
          {loading ? '…' : `${list.length} client${list.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Client list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 14px 8px' }}>
        {loading && <div style={{ padding: 40, textAlign: 'center', color: '#bbb', fontSize: 14 }}>Loading…</div>}

        {!loading && visibleList.map(c => {
          const st = STATUS_STYLE[c.status] || STATUS_STYLE.inactive
          const isOpen = expanded === c.id
          return (
            <div key={c.id} style={{ background: '#fff', borderRadius: 10, marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              {/* Card header — always visible */}
              <div onClick={() => toggle(c.id)}
                style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div style={{ width: 38, height: 38, borderRadius: 19, background: '#1a1a2e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 1 }}>{c.ref} {c.plan ? `· ${c.plan}` : ''}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: st.bg, color: st.color, fontWeight: 600 }}>{st.label}</span>
                  <span style={{ fontSize: 14, color: '#ccc', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                </div>
              </div>

              {/* Expanded details */}
              {isOpen && (
                <div style={{ borderTop: '1px solid #f0f0f0', padding: '14px 14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {c.zone  && <div style={{ fontSize: 13, color: '#555' }}>📍 {c.zone}</div>}
                    {c.phone && (
                      <a href={`tel:${c.phone.replace(/\s/g, '')}`}
                        style={{ fontSize: 13, color: '#1a6eb5', fontWeight: 600, textDecoration: 'none' }}>
                        📞 {c.phone}
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => navigate('/m/new', { state: { client: c.name, phone: c.phone, zone: c.zone, contract: c.plan } })}
                    style={{ width: '100%', background: '#1a1a2e', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                    + New Ticket for this Client
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {!loading && list.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#bbb', fontSize: 14 }}>No clients found</div>
        )}
        {!loading && hiddenClientCount > 0 && (
          <div style={{ padding: '10px 12px 18px', textAlign: 'center', color: '#888', fontSize: 12 }}>
            Showing first {visibleList.length} results. Search to narrow the list.
          </div>
        )}
      </div>

      <BottomNav active="clients" />
    </div>
  )
}
