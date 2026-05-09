import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getTicket, updateTicket, postActivity } from '../../data/api'
import { StatusBadge, TypeBadge } from '../../components/Badge'
import { useAuth } from '../../contexts/AuthContext'

const STATUS_STEPS = ['On My Way', 'On Site', 'Resolved']
const STATUS_MAP   = { 0: 'inprog', 1: 'inprog', 2: 'closed' }
const STEP_FROM_STATUS = { open: 0, inprog: 1, closed: 2 }

export default function TechTicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeStep, setActiveStep] = useState(0)
  const [note, setNote] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    getTicket(id)
      .then(t => { setTicket(t); setActiveStep(STEP_FROM_STATUS[t.status] ?? 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleStepChange = async (i) => {
    setActiveStep(i)
    try {
      await updateTicket(id, { status: STATUS_MAP[i] })
      await postActivity(id, { author: user?.name || 'Technician', text: `Status updated: ${STATUS_STEPS[i]}` })
      const updated = await getTicket(id)
      setTicket(updated)
    } catch (err) {
      console.error(err)
    }
  }

  const handlePostNote = async () => {
    if (!note.trim()) return
    setPosting(true)
    try {
      await postActivity(id, { author: user?.name || 'Technician', text: note })
      const updated = await getTicket(id)
      setTicket(updated)
      setNote('')
    } catch (err) {
      console.error(err)
    } finally {
      setPosting(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 14 }}>
      Loading…
    </div>
  )

  if (!ticket) return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 14 }}>
      Ticket not found.
    </div>
  )

  const phoneHref = ticket.phone ? `tel:${ticket.phone.replace(/\s/g, '')}` : null
  const mapsHref  = ticket.address ? `https://maps.google.com/?q=${encodeURIComponent(ticket.address + ' ' + (ticket.zone || ''))}` : null

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: '#1a1a2e', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={() => navigate('/mobile')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>←</button>
        <span style={{ fontWeight: 700, fontSize: 17, color: '#fff' }}>Ticket #{ticket.id}</span>
        <div style={{ marginLeft: 'auto' }}><StatusBadge status={ticket.status} /></div>
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
            </div>
            <TypeBadge type={ticket.type} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={phoneHref || '#'} style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 0', background: phoneHref ? '#fff' : '#f9f9f9', fontSize: 13, color: phoneHref ? '#333' : '#bbb', cursor: phoneHref ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 500, textDecoration: 'none' }}>
              📞 Call
            </a>
            <a href={mapsHref || '#'} target="_blank" rel="noreferrer" style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 0', background: mapsHref ? '#fff' : '#f9f9f9', fontSize: 13, color: mapsHref ? '#333' : '#bbb', cursor: mapsHref ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 500, textDecoration: 'none' }}>
              🗺 Navigate
            </a>
          </div>
        </div>

        {/* Description */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Description</div>
          <p style={{ fontSize: 14, color: '#333', lineHeight: 1.6, margin: 0 }}>
            {ticket.fullDescription || ticket.description || '—'}
          </p>
          {ticket.contract && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#aaa' }}>Contract: <span style={{ color: '#555' }}>{ticket.contract}</span></div>
          )}
        </div>

        {/* Status update */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Update Status</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {STATUS_STEPS.map((s, i) => (
              <button key={s} onClick={() => handleStepChange(i)}
                style={{ flex: 1, border: `2px solid ${i === activeStep ? '#1a6eb5' : '#e2e8f0'}`, borderRadius: 8, padding: '10px 4px', textAlign: 'center', background: i === activeStep ? '#e8f0fb' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ fontSize: 11, fontWeight: i === activeStep ? 700 : 400, color: i === activeStep ? '#1a6eb5' : '#888' }}>{s}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Activity log */}
        {ticket.activity && ticket.activity.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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

        {/* Field note */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Add Note</div>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Add an observation or update…" rows={3}
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

      </div>
    </div>
  )
}
