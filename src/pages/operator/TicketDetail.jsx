import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getTicket, updateTicket, postActivity, getTechnicians, deleteTicket } from '../../data/api'
import { StatusBadge, TypeBadge } from '../../components/Badge'
import TopNav from '../../components/TopNav'
import { useAuth } from '../../contexts/AuthContext'

function SectionLabel({ children }) {
  return <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{children}</div>
}

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('')
  const [posting, setPosting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [technicians, setTechnicians] = useState([])

  useEffect(() => { getTechnicians().then(setTechnicians).catch(console.error) }, [])

  useEffect(() => {
    getTicket(id)
      .then(t => { setTicket(t); setStatus(t.status) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus)
    try {
      await updateTicket(id, { status: newStatus })
      setTicket(t => ({ ...t, status: newStatus }))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteTicket(id)
      navigate('/operator')
    } catch (err) { console.error(err) }
  }

  const handleAssign = async (techId) => {
    try {
      await updateTicket(id, { technician_id: techId || null })
      const tech = technicians.find(t => String(t.id) === String(techId))
      await postActivity(id, { author: 'Operator', text: tech ? `Assigned to ${tech.name}` : 'Unassigned' })
      const updated = await getTicket(id)
      setTicket(updated)
    } catch (err) { console.error(err) }
  }

  const handlePostNote = async () => {
    if (!note.trim()) return
    setPosting(true)
    try {
      await postActivity(id, { author: 'Operator', text: note })
      const updated = await getTicket(id)
      setTicket(updated)
      setNote('')
    } catch (err) {
      console.error(err)
    } finally {
      setPosting(false)
    }
  }

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 14 }}>Loading…</div>
  if (error)   return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e74c3c', fontSize: 14 }}>Error: {error}</div>

  const infoFields = [
    { label: 'Client',   value: ticket.client },
    { label: 'Zone',     value: ticket.zone },
    { label: 'Address',  value: ticket.address },
    { label: 'Contract', value: ticket.contract },
    { label: 'Phone',    value: ticket.phone },
    { label: 'Priority', value: ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1) },
  ]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <TopNav />
      {/* Breadcrumb bar */}
      <div style={{ height: 40, background: '#fff', borderBottom: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8, flexShrink: 0 }}>
        <button onClick={() => navigate('/operator')} style={{ background: 'none', border: 'none', color: '#1a6eb5', fontSize: 13, cursor: 'pointer', padding: 0 }}>Tickets</button>
        <span style={{ color: '#ccc', fontSize: 14 }}>›</span>
        <span style={{ color: '#1a1a2e', fontSize: 13, fontWeight: 600 }}>#{ticket.id} — {ticket.client}</span>
        <div style={{ flex: 1 }} />
        <StatusBadge status={ticket.status} />
        {user?.role === 'admin' && (
          confirmDelete ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
              <span style={{ fontSize: 12, color: '#e74c3c' }}>Delete this ticket?</span>
              <button onClick={() => setConfirmDelete(false)}
                style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 5, color: '#555', fontSize: 12, cursor: 'pointer', padding: '3px 10px' }}>Cancel</button>
              <button onClick={handleDelete}
                style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '3px 10px' }}>Confirm</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              style={{ background: 'none', border: '1px solid #fcd5d5', borderRadius: 5, color: '#e74c3c', fontSize: 12, cursor: 'pointer', padding: '3px 12px', marginLeft: 8 }}>
              Delete Ticket
            </button>
          )
        )}
        <button onClick={() => navigate('/operator')} style={{ background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 5, color: '#555', fontSize: 12, cursor: 'pointer', padding: '3px 12px', marginLeft: 8 }}>← Back</button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <TypeBadge type={ticket.type} />
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#aaa' }}>CREATED {ticket.createdAt} • #{ticket.id}</span>
              </div>
              <h1 style={{ fontSize: 21, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{ticket.description}</h1>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <select value={status} onChange={e => handleStatusChange(e.target.value)}
                style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: '#555', background: '#fff', cursor: 'pointer', outline: 'none' }}>
                <option value="open">Open</option>
                <option value="inprog">In Progress</option>
                <option value="closed">Closed</option>
              </select>
              <button
                onClick={() => document.getElementById('ticket-assignment-select')?.focus()}
                style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Assign Tech
              </button>
            </div>
          </div>

          <div style={{ background: '#f4f4f4', border: '1px solid #e8e8e8', borderRadius: 8, padding: 16 }}>
            <SectionLabel>Description</SectionLabel>
            <p style={{ fontSize: 14, color: '#333', lineHeight: 1.6, margin: 0 }}>{ticket.fullDescription}</p>
          </div>

          <div>
            <SectionLabel>Activity Log</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {ticket.activity.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: 16, position: 'relative' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 5, flexShrink: 0, marginTop: 3, zIndex: 1, background: i === ticket.activity.length - 1 ? '#1a6eb5' : '#ddd', border: i === ticket.activity.length - 1 ? '2px solid #d0e4f7' : 'none' }} />
                  {i < ticket.activity.length - 1 && <div style={{ position: 'absolute', left: 4.5, top: 13, width: 1, bottom: 0, background: '#eee' }} />}
                  <div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 3, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{h.who}</span>
                      <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#bbb' }}>{h.time}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{h.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ border: '1.5px dashed #ddd', borderRadius: 8, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-end', background: '#fafafa' }}>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note or update..." rows={2}
                style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', fontSize: 13, color: '#333', background: 'transparent', lineHeight: 1.5 }} />
              <button onClick={handlePostNote} disabled={posting || !note.trim()}
                style={{ background: posting || !note.trim() ? '#999' : '#1a1a2e', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: posting ? 'default' : 'pointer', flexShrink: 0 }}>
                {posting ? '…' : 'Post'}
              </button>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width: 264, borderLeft: '1px solid #e8e8e8', padding: 20, background: '#fafafa', overflow: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <SectionLabel>Client Info</SectionLabel>
            {infoFields.map(f => (
              <div key={f.label} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</div>
                <div style={{ fontSize: 14, color: '#1a1a2e', fontWeight: 600 }}>{f.value}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #ebebeb' }} />
          <div>
            <SectionLabel>Assignment</SectionLabel>
            {ticket.agent ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 16, background: '#4a9eff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700, flexShrink: 0 }}>{ticket.agentId}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{ticket.agent}</div>
                  <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#27ae60' }}>● On site</div>
                </div>
              </div>
            ) : <div style={{ fontSize: 13, color: '#aaa', marginBottom: 10 }}>Unassigned</div>}
            <select
              id="ticket-assignment-select"
              value={ticket.technician_id ?? ''}
              onChange={e => handleAssign(e.target.value)}
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#555', background: '#fff', cursor: 'pointer', outline: 'none' }}>
              <option value="">Unassigned</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div style={{ borderTop: '1px solid #ebebeb' }} />
          <div>
            <SectionLabel>SLA Timer</SectionLabel>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#e67e22' }}>{ticket.sla.elapsed}</div>
            <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ width: `${ticket.sla.percent}%`, height: '100%', borderRadius: 3, background: ticket.sla.percent > 80 ? '#e74c3c' : ticket.sla.percent > 60 ? '#e67e22' : '#27ae60' }} />
            </div>
            <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#bbb', marginTop: 5 }}>Target: {ticket.sla.target} / Elapsed: {ticket.sla.elapsed}</div>
          </div>
          <div style={{ borderTop: '1px solid #ebebeb' }} />
          <div>
            <SectionLabel>Attachments</SectionLabel>
            <div style={{ border: '1.5px dashed #ddd', borderRadius: 8, padding: '10px 14px', textAlign: 'center', fontSize: 12, color: '#bbb', cursor: 'pointer' }}>+ Attach file or photo</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {['photo', 'map'].map(label => (
                <div key={label} style={{ width: 64, height: 52, background: '#f0f0f0', border: '1px solid #e0e0e0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#bbb', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase' }}>{label}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
