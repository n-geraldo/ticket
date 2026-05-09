import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getTicket, updateTicket, deleteTicket, postActivity, getTechnicians } from '../../data/api'
import { StatusBadge, TypeBadge } from '../../components/Badge'
import { useAuth } from '../../contexts/AuthContext'

const STATUS_OPTIONS = [
  { value: 'open',   label: 'Open' },
  { value: 'inprog', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
]

const PRIORITY_COLORS = { high: '#e74c3c', med: '#e67e22', low: '#27ae60' }

export default function MobileTicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [technicians, setTechnicians] = useState([])
  const [note, setNote] = useState('')
  const [posting, setPosting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([getTicket(id), getTechnicians()])
      .then(([t, techs]) => { setTicket(t); setTechnicians(techs) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleStatusChange = async (status) => {
    setSaving(true)
    try {
      await updateTicket(id, { status })
      await postActivity(id, { author: user?.name || 'Operator', text: `Status changed to ${STATUS_OPTIONS.find(s => s.value === status)?.label}` })
      const updated = await getTicket(id)
      setTicket(updated)
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleAssign = async (technician_id) => {
    setSaving(true)
    try {
      const techName = technicians.find(t => String(t.id) === String(technician_id))?.name || 'Unassigned'
      await updateTicket(id, { technician_id: technician_id || null })
      await postActivity(id, { author: user?.name || 'Operator', text: technician_id ? `Assigned to ${techName}` : 'Unassigned' })
      const updated = await getTicket(id)
      setTicket(updated)
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handlePostNote = async () => {
    if (!note.trim()) return
    setPosting(true)
    try {
      await postActivity(id, { author: user?.name || 'Operator', text: note })
      const updated = await getTicket(id)
      setTicket(updated)
      setNote('')
    } catch (err) { console.error(err) }
    finally { setPosting(false) }
  }

  const handleDelete = async () => {
    try {
      await deleteTicket(id)
      navigate('/m')
    } catch (err) { console.error(err) }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 14 }}>Loading…</div>
  )
  if (!ticket) return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 14 }}>Ticket not found.</div>
  )

  const phoneHref = ticket.phone ? `tel:${ticket.phone.replace(/\s/g, '')}` : null
  const mapsHref  = ticket.address ? `https://maps.google.com/?q=${encodeURIComponent(ticket.address + ' ' + (ticket.zone || ''))}` : null

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: '#1a1a2e', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={() => navigate('/m')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>←</button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>Ticket #{ticket.id}</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{ticket.createdAt}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: 5, background: PRIORITY_COLORS[ticket.priority] || '#ccc', flexShrink: 0 }} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Client card */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#1a1a2e', marginBottom: 4 }}>{ticket.client}</div>
              {ticket.address && <div style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>{ticket.address}</div>}
              {ticket.zone    && <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>📍 {ticket.zone}</div>}
              {ticket.phone   && <div style={{ fontSize: 13, color: '#1a6eb5', fontWeight: 600 }}>📞 {ticket.phone}</div>}
              {ticket.contract && <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Contract: {ticket.contract}</div>}
            </div>
            <TypeBadge type={ticket.type} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={phoneHref || '#'}
              style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 0', background: '#fff', fontSize: 13, color: phoneHref ? '#333' : '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 500, textDecoration: 'none', cursor: phoneHref ? 'pointer' : 'default' }}>
              📞 Call
            </a>
            <a href={mapsHref || '#'} target="_blank" rel="noreferrer"
              style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 0', background: '#fff', fontSize: 13, color: mapsHref ? '#333' : '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 500, textDecoration: 'none', cursor: mapsHref ? 'pointer' : 'default' }}>
              🗺 Navigate
            </a>
          </div>
        </div>

        {/* Description */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Description</div>
          <p style={{ fontSize: 14, color: '#333', lineHeight: 1.6, margin: 0 }}>{ticket.fullDescription || ticket.description || '—'}</p>
        </div>

        {/* Status */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Status</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {STATUS_OPTIONS.map(s => (
              <button key={s.value} onClick={() => !saving && handleStatusChange(s.value)}
                style={{ flex: 1, border: `2px solid ${ticket.status === s.value ? '#1a6eb5' : '#e2e8f0'}`, borderRadius: 8, padding: '10px 4px', textAlign: 'center', background: ticket.status === s.value ? '#e8f0fb' : '#fff', cursor: saving ? 'default' : 'pointer' }}>
                <div style={{ fontSize: 11, fontWeight: ticket.status === s.value ? 700 : 400, color: ticket.status === s.value ? '#1a6eb5' : '#888' }}>{s.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Assign technician */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Assigned Technician</div>
          <select
            value={ticket.technician_id || ''}
            onChange={e => handleAssign(e.target.value)}
            disabled={saving}
            style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#333', background: '#fff', outline: 'none', cursor: 'pointer' }}>
            <option value="">— Unassigned —</option>
            {technicians.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* SLA */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>SLA</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#555' }}>Elapsed: <strong>{ticket.sla?.elapsed}</strong></span>
            <span style={{ fontSize: 13, color: '#555' }}>Target: <strong>{ticket.sla?.target}</strong></span>
          </div>
          <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${ticket.sla?.percent || 0}%`, background: (ticket.sla?.percent || 0) > 80 ? '#e74c3c' : (ticket.sla?.percent || 0) > 60 ? '#e67e22' : '#27ae60', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 4, textAlign: 'right' }}>{ticket.sla?.percent}% of target</div>
        </div>

        {/* Activity */}
        {ticket.activity && ticket.activity.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ticket.activity.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 15, background: '#1a1a2e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {a.who?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{a.who}</span>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#bbb' }}>{a.time}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{a.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add note */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Add Note</div>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Add a note or update…" rows={3}
            style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#333', resize: 'none', outline: 'none', lineHeight: 1.5, fontFamily: 'inherit' }}
            onFocus={e => e.target.style.border = '1.5px solid #1a6eb5'}
            onBlur={e => e.target.style.border = '1.5px solid #e2e8f0'}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button onClick={handlePostNote} disabled={posting || !note.trim()}
              style={{ background: posting || !note.trim() ? '#ccc' : '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: posting || !note.trim() ? 'default' : 'pointer' }}>
              {posting ? 'Posting…' : 'Post Note'}
            </button>
          </div>
        </div>

        {/* Delete */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 4 }}>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              style={{ width: '100%', background: 'none', border: '1.5px solid #e74c3c', borderRadius: 8, padding: '10px', fontSize: 13, color: '#e74c3c', fontWeight: 600, cursor: 'pointer' }}>
              Delete Ticket
            </button>
          ) : (
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 13, color: '#c0392b', marginBottom: 12, fontWeight: 600 }}>Delete this ticket permanently?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirmDelete(false)}
                  style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 7, padding: '9px', fontSize: 13, background: '#fff', color: '#555', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleDelete}
                  style={{ flex: 1, background: '#e74c3c', border: 'none', borderRadius: 7, padding: '9px', fontSize: 13, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  Confirm Delete
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
