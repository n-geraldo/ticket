import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClients, createClient, updateClient, deleteClient, getTickets } from '../../data/api'
import { StatusBadge, TypeBadge } from '../../components/Badge'
import TopNav from '../../components/TopNav'

const inp = {
  border: '1px solid #e2e8f0', borderRadius: 6, padding: '7px 10px',
  fontSize: 13, color: '#1a1a2e', outline: 'none', background: '#fff', width: '100%',
}

const monoLabel = {
  fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
}

const STATUS_META = {
  active:    { dot: '#27ae60', text: '#27ae60', bg: '#edfaf2', border: '#b7ecd0' },
  suspended: { dot: '#f39c12', text: '#b56a00', bg: '#fef9e7', border: '#f9d89b' },
  inactive:  { dot: '#e74c3c', text: '#e74c3c', bg: '#fff5f5', border: '#fcd5d5' },
  expired:   { dot: '#9b59b6', text: '#7d3c98', bg: '#f9f0ff', border: '#d7bde2' },
}

function ClientStatus({ status }) {
  const m = STATUS_META[status] || STATUS_META.inactive
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: m.bg, border: `1px solid ${m.border}`, borderRadius: 20, padding: '3px 10px' }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: m.dot, display: 'inline-block' }} />
      <span style={{ fontSize: 12, color: m.text, fontWeight: 600, textTransform: 'capitalize' }}>{status}</span>
    </span>
  )
}

const PLANS = ['RES-FTTH-50M', 'RES-FTTH-100M', 'BUS-FTTH-200M', 'PRO-FTTH-100M', 'PRO-FTTH-200M', 'HOTEL-FTTH-1G', 'EDU-FTTH-500M']
const ALL_ZONES = ['Zone 1 — City Center', 'Zone 2 — East District', 'Zone 3 — North District', 'Zone 4 — South District', 'Zone 5 — University']
const STATUSES = ['active', 'suspended', 'inactive', 'expired']
const MAX_VISIBLE_CLIENTS = 250

const BLANK_CLIENT = { name: '', ref: '', plan: '', zone: '', phone: '', status: 'active' }

export default function Clients() {
  const navigate = useNavigate()

  const [clients, setClients]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [zoneFilter, setZoneFilter] = useState('All Zones')
  const [statusFilter, setStatusFilter] = useState('all')

  // Add client
  const [adding, setAdding]   = useState(false)
  const [newClient, setNewClient] = useState(BLANK_CLIENT)
  const [saving, setSaving]   = useState(false)
  const [addError, setAddError] = useState('')

  // Detail panel
  const [selected, setSelected]         = useState(null)
  const [editing, setEditing]           = useState(false)
  const [editData, setEditData]         = useState({})
  const [clientTickets, setClientTickets] = useState([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    getClients()
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setTicketsLoading(true)
    getTickets()
      .then(all => setClientTickets(all.filter(t => t.client === selected.name)))
      .catch(console.error)
      .finally(() => setTicketsLoading(false))
  }, [selected?.id])

  const zones = ['All Zones', ...new Set(clients.map(c => c.zone?.split(' — ')[0]).filter(Boolean))]

  const stats = {
    total:     clients.length,
    active:    clients.filter(c => c.status === 'active').length,
    suspended: clients.filter(c => c.status === 'suspended').length,
    inactive:  clients.filter(c => c.status === 'inactive').length,
    expired:   clients.filter(c => c.status === 'expired').length,
  }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !search || c.name.toLowerCase().includes(q) || c.ref.toLowerCase().includes(q) || (c.phone || '').includes(q)
    const matchZone   = zoneFilter === 'All Zones' || c.zone?.startsWith(zoneFilter)
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchZone && matchStatus
  })
  const visibleClients = filtered.slice(0, MAX_VISIBLE_CLIENTS)
  const hiddenClientCount = Math.max(0, filtered.length - visibleClients.length)

  const setNew  = (k, v) => setNewClient(n => ({ ...n, [k]: v }))
  const setEdit = (k, v) => setEditData(d => ({ ...d, [k]: v }))

  const handleAdd = async () => {
    if (!newClient.name.trim()) return
    setSaving(true); setAddError('')
    try {
      const created = await createClient(newClient)
      setClients(cs => [...cs, created])
      setNewClient(BLANK_CLIENT)
      setAdding(false)
    } catch (err) {
      setAddError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const openClient = c => {
    setSelected(c)
    setEditing(false)
    setConfirmingDelete(false)
    setEditData({ name: c.name, plan: c.plan || '', zone: c.zone || '', phone: c.phone || '', status: c.status })
  }

  const handleDelete = async () => {
    try {
      await deleteClient(selected.id)
      setClients(cs => cs.filter(c => c.id !== selected.id))
      setSelected(null)
      setConfirmingDelete(false)
    } catch (err) { console.error(err) }
  }

  const handleSave = async () => {
    try {
      await updateClient(selected.id, editData)
      const updated = { ...selected, ...editData }
      setClients(cs => cs.map(c => c.id === selected.id ? { ...c, ...editData } : c))
      setSelected(updated)
      setEditing(false)
    } catch (err) { console.error(err) }
  }

  const handleStatusChange = async newStatus => {
    try {
      await updateClient(selected.id, { status: newStatus })
      setClients(cs => cs.map(c => c.id === selected.id ? { ...c, status: newStatus } : c))
      setSelected(s => ({ ...s, status: newStatus }))
    } catch (err) { console.error(err) }
  }

  const STAT_CARDS = [
    { label: 'Total Clients', val: stats.total,     color: '#1a1a2e' },
    { label: 'Active',        val: stats.active,     color: '#27ae60' },
    { label: 'Suspended',     val: stats.suspended,  color: '#f39c12' },
    { label: 'Inactive',      val: stats.inactive,   color: '#e74c3c' },
    { label: 'Expired',       val: stats.expired,    color: '#7d3c98' },
  ]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <TopNav />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header area */}
        <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 16 }}>
            {STAT_CARDS.map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ref or phone…"
              style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 12px', fontSize: 13, width: 240, outline: 'none', background: '#fff', color: '#1a1a2e' }} />
            <select value={zoneFilter} onChange={e => setZoneFilter(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: '#555', background: '#fff', cursor: 'pointer', outline: 'none' }}>
              {zones.map(z => <option key={z}>{z}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: '#555', background: '#fff', cursor: 'pointer', outline: 'none' }}>
              <option value="all">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: '#aaa' }}>{filtered.length} client{filtered.length !== 1 ? 's' : ''}{hiddenClientCount ? ` · showing ${visibleClients.length}` : ''}</span>
            <span style={{ fontSize: 12, color: '#888' }}>Clients are saved when a ticket is created.</span>
          </div>

          {/* Add client form */}
          {adding && (
            <div style={{ background: '#fff', border: '1px solid #1a6eb5', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 12 }}>New Client</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={monoLabel}>Client Name *</div>
                  <input autoFocus value={newClient.name} onChange={e => setNew('name', e.target.value)} placeholder="Full name" style={inp} />
                </div>
                <div>
                  <div style={monoLabel}>Reference (auto if blank)</div>
                  <input value={newClient.ref} onChange={e => setNew('ref', e.target.value)} placeholder="CLT-001" style={inp} />
                </div>
                <div>
                  <div style={monoLabel}>Phone</div>
                  <input value={newClient.phone} onChange={e => setNew('phone', e.target.value)} placeholder="+213 555 000 000" style={inp} />
                </div>
                <div>
                  <div style={monoLabel}>Plan</div>
                  <input value={newClient.plan} onChange={e => setNew('plan', e.target.value)} list="plan-opts" placeholder="RES-FTTH-100M" style={inp} />
                  <datalist id="plan-opts">{PLANS.map(p => <option key={p} value={p} />)}</datalist>
                </div>
                <div>
                  <div style={monoLabel}>Zone</div>
                  <input value={newClient.zone} onChange={e => setNew('zone', e.target.value)} list="zone-opts" placeholder="Zone 1 — City Center" style={inp} />
                  <datalist id="zone-opts">{ALL_ZONES.map(z => <option key={z} value={z} />)}</datalist>
                </div>
                <div>
                  <div style={monoLabel}>Status</div>
                  <select value={newClient.status} onChange={e => setNew('status', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              {addError && <div style={{ fontSize: 12, color: '#e74c3c', marginBottom: 10 }}>{addError}</div>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => { setAdding(false); setAddError('') }}
                  style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 14px', fontSize: 13, color: '#555', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleAdd} disabled={saving || !newClient.name.trim()}
                  style={{ background: saving || !newClient.name.trim() ? '#aaa' : '#1a1a2e', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: saving || !newClient.name.trim() ? 'default' : 'pointer' }}>
                  {saving ? 'Saving…' : 'Save Client'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main: table + detail panel */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: 12, margin: '0 24px 24px' }}>

          {/* Table */}
          <div style={{ flex: 1, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 150px 130px 64px 116px 64px', padding: '8px 16px', background: '#fafafa', borderBottom: '1px solid #eee', flexShrink: 0 }}>
              {['Ref', 'Client', 'Plan', 'Zone', 'Tickets', 'Status', ''].map(h => (
                <div key={h} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
              ))}
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
              {loading && <div style={{ padding: 48, textAlign: 'center', color: '#aaa', fontSize: 14 }}>Loading…</div>}

              {!loading && visibleClients.map((c, i) => {
                const sel = selected?.id === c.id
                return (
                  <div key={c.id} onClick={() => openClient(c)}
                    style={{ display: 'grid', gridTemplateColumns: '90px 1fr 150px 130px 64px 116px 64px', padding: '12px 16px', borderBottom: '1px solid #f5f5f5', alignItems: 'center', cursor: 'pointer', background: sel ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#fafafa', borderLeft: sel ? '3px solid #1a6eb5' : '3px solid transparent', transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#f5f8ff' }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa' }}
                  >
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#aaa' }}>{c.ref}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{c.name}</div>
                      {c.phone && <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{c.phone}</div>}
                    </div>
                    <div style={{ fontSize: 12, color: '#555' }}>{c.plan || '—'}</div>
                    <div style={{ fontSize: 12, color: '#555' }}>{c.zone?.split(' — ')[0] || '—'}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: c.tickets > 0 ? 700 : 400, color: c.tickets > 0 ? '#1a6eb5' : '#bbb' }}>{c.tickets}</div>
                    <ClientStatus status={c.status} />
                    <button onClick={e => { e.stopPropagation(); openClient(c) }}
                      style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#555', cursor: 'pointer' }}>
                      View
                    </button>
                  </div>
                )
              })}

              {!loading && filtered.length === 0 && (
                <div style={{ padding: 48, textAlign: 'center', color: '#aaa', fontSize: 14 }}>No clients found</div>
              )}
              {!loading && hiddenClientCount > 0 && (
                <div style={{ padding: '12px 16px', textAlign: 'center', color: '#888', fontSize: 12, borderTop: '1px solid #f0f0f0' }}>
                  Showing first {visibleClients.length} results. Use search or filters to narrow the client list.
                </div>
              )}
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ width: 340, flexShrink: 0, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Panel header */}
              <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3 }}>{selected.name}</div>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ClientStatus status={selected.status} />
                  <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#bbb' }}>{selected.ref}</span>
                </div>
              </div>

              <div style={{ flex: 1, overflow: 'auto' }}>
                {editing ? (
                  /* ── Edit form ── */
                  <div style={{ padding: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                      <div>
                        <div style={monoLabel}>Client Name</div>
                        <input autoFocus value={editData.name} onChange={e => setEdit('name', e.target.value)} style={inp} />
                      </div>
                      <div>
                        <div style={monoLabel}>Plan</div>
                        <input value={editData.plan} onChange={e => setEdit('plan', e.target.value)} list="edit-plan-opts" style={inp} />
                        <datalist id="edit-plan-opts">{PLANS.map(p => <option key={p} value={p} />)}</datalist>
                      </div>
                      <div>
                        <div style={monoLabel}>Zone</div>
                        <input value={editData.zone} onChange={e => setEdit('zone', e.target.value)} list="edit-zone-opts" style={inp} />
                        <datalist id="edit-zone-opts">{ALL_ZONES.map(z => <option key={z} value={z} />)}</datalist>
                      </div>
                      <div>
                        <div style={monoLabel}>Phone</div>
                        <input value={editData.phone} onChange={e => setEdit('phone', e.target.value)} style={inp} />
                      </div>
                      <div>
                        <div style={monoLabel}>Status</div>
                        <select value={editData.status} onChange={e => setEdit('status', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setEditing(false)}
                        style={{ flex: 1, background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: 7, fontSize: 13, color: '#555', cursor: 'pointer' }}>
                        Cancel
                      </button>
                      <button onClick={handleSave}
                        style={{ flex: 1, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 6, padding: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── View mode ── */
                  <>
                    {/* Info fields */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0' }}>
                      {[
                        { label: 'Reference', val: selected.ref },
                        { label: 'Plan',      val: selected.plan  || '—' },
                        { label: 'Zone',      val: selected.zone  || '—' },
                        { label: 'Phone',     val: selected.phone || '—' },
                      ].map(f => (
                        <div key={f.label} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</div>
                          <div style={{ fontSize: 13, color: '#1a1a2e', fontWeight: 500, marginTop: 2 }}>
                            {f.label === 'Phone' && f.val !== '—'
                              ? <a href={`tel:${f.val}`} style={{ color: '#1a6eb5', textDecoration: 'none' }}>{f.val}</a>
                              : f.val}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick status change */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ ...monoLabel, marginBottom: 8 }}>Change Status</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {STATUSES.map(s => {
                          const active = selected.status === s
                          const m = STATUS_META[s]
                          return (
                            <button key={s} onClick={() => handleStatusChange(s)}
                              style={{ flex: 1, padding: '5px 0', fontSize: 12, borderRadius: 6, cursor: 'pointer', fontWeight: active ? 600 : 400, background: active ? m.bg : '#f5f5f5', border: active ? `1px solid ${m.border}` : '1px solid #e2e8f0', color: active ? m.text : '#888' }}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                      {confirmingDelete ? (
                        <div style={{ background: '#fff5f5', border: '1px solid #fcd5d5', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontSize: 13, color: '#e74c3c', marginBottom: 8 }}>Delete "{selected.name}"?</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setConfirmingDelete(false)}
                              style={{ flex: 1, background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: 7, fontSize: 13, color: '#555', cursor: 'pointer' }}>
                              Cancel
                            </button>
                            <button onClick={handleDelete}
                              style={{ flex: 1, background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                              Confirm Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setEditing(true)}
                            style={{ flex: 1, background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: 7, fontSize: 13, color: '#555', cursor: 'pointer', fontWeight: 500 }}>
                            Edit Client
                          </button>
                          <button onClick={() => navigate('/operator/new', { state: { client: selected.name } })}
                            style={{ flex: 1, background: '#1a6eb5', color: '#fff', border: 'none', borderRadius: 6, padding: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            + New Ticket
                          </button>
                          <button onClick={() => setConfirmingDelete(true)}
                            style={{ background: 'none', border: '1px solid #fcd5d5', borderRadius: 6, padding: '7px 10px', fontSize: 13, color: '#e74c3c', cursor: 'pointer' }}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Ticket history */}
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ ...monoLabel, marginBottom: 10 }}>
                        Ticket History{clientTickets.length > 0 ? ` (${clientTickets.length})` : ''}
                      </div>
                      {ticketsLoading && <div style={{ fontSize: 12, color: '#aaa' }}>Loading…</div>}
                      {!ticketsLoading && clientTickets.length === 0 && (
                        <div style={{ fontSize: 12, color: '#bbb', padding: '8px 0' }}>No tickets for this client.</div>
                      )}
                      {!ticketsLoading && clientTickets.map(t => (
                        <div key={t.id} onClick={() => navigate(`/operator/ticket/${t.id}`)}
                          style={{ padding: '10px 12px', border: '1px solid #f0f0f0', borderRadius: 6, marginBottom: 6, cursor: 'pointer', background: '#fafafa' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f0f4fa'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fafafa'}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#1a6eb5', fontWeight: 700 }}>#{t.id}</span>
                            <span style={{ fontSize: 11, color: '#bbb' }}>{t.time}</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#333', fontWeight: 500, marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.description}
                          </div>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <TypeBadge type={t.type} />
                            <StatusBadge status={t.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
