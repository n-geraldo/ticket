import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { createTicket, getTechnicians, getCategories, searchClients, syncLocalDMAConnection } from '../../data/api'
import TopNav from '../../components/TopNav'

const MODULES = [
  {
    icon: '👤', label: 'Client Info',
    fields: [
      { key: 'client',  label: 'Client name / account', type: 'clientSelect', span: 2 },
      { key: 'address', label: 'Address' },
      { key: 'zone',    label: 'Zone' },
      { key: 'phone',   label: 'Phone' },
      { key: 'contract', label: 'Contract / plan' },
    ],
  },
  {
    icon: '🔧', label: 'Problem Details',
    fields: [
      { key: 'priority',    label: 'Priority',    type: 'select', options: ['high', 'med', 'low'] },
      { key: 'category',    label: 'Category',    type: 'categorySelect' },
      { key: 'description', label: 'Description', type: 'textarea', span: 2 },
    ],
  },
  {
    icon: '👷', label: 'Assignment',
    fields: [
      { key: 'technician_id',  label: 'Assign technician', type: 'techSelect' },
      { key: 'estimatedVisit', label: 'Estimated visit', type: 'datetime' },
    ],
  },
]

const INSTALL_CATEGORY_NAME = 'New Installation'
const normalizeCategory = (name) => String(name || '').toLowerCase().replace(/[^a-z]/g, '')
const isInstallCategory = (name) => ['newinstallation', 'newinstalation'].includes(normalizeCategory(name))

export default function NewTicketForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const [ticketType, setTicketType] = useState('problem')
  const [technicians, setTechnicians] = useState([])
  const [categories, setCategories] = useState([])
  const [clientOptions, setClientOptions] = useState([])
  const [showClientOptions, setShowClientOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    client: location.state?.client || '',
    clientRef: '',
    email: '',
    address: '',
    zone: location.state?.zone || '',
    phone: location.state?.phone || '',
    contract: location.state?.contract || '',
    priority: 'high',
    category: '',
    description: '',
    technician_id: '',
    estimatedVisit: '',
  })
  const installCategory = categories.find(c => isInstallCategory(c.name)) || { id: 'install', name: INSTALL_CATEGORY_NAME }
  const problemCategories = categories.filter(c => !isInstallCategory(c.name))
  const categoryOptions = ticketType === 'install'
    ? [installCategory]
    : (problemCategories.length ? problemCategories : [{ id: 'uncategorized', name: 'Uncategorized' }])

  useEffect(() => {
    Promise.all([getTechnicians(), getCategories()])
      .then(([techs, cats]) => {
        setTechnicians(techs)
        setCategories(cats)
      })
      .catch(console.error)
    syncLocalDMAConnection().catch(console.error)
  }, [])

  useEffect(() => {
    const nextCategory = ticketType === 'install'
      ? installCategory.name
      : categoryOptions[0]?.name || ''
    setForm(f => categoryOptions.some(c => c.name === f.category) ? f : { ...f, category: nextCategory })
  }, [ticketType, categories])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchClients(form.client.trim())
        .then(setClientOptions)
        .catch(console.error)
    }, 250)
    return () => clearTimeout(timer)
  }, [form.client])

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const selectClient = (client) => {
    if (!client) return
    setForm(f => ({
      ...f,
      client: client.name || f.client,
      clientRef: client.ref || f.clientRef,
      email: client.email || f.email,
      zone: client.zone || f.zone,
      phone: client.phone || f.phone,
      contract: client.plan || f.contract,
    }))
    setShowClientOptions(false)
  }

  const pickExactClient = () => {
    const q = form.client.trim().toLowerCase()
    const found = clientOptions.find(c =>
      c.name?.toLowerCase() === q || c.ref?.toLowerCase() === q
    )
    selectClient(found)
  }

  const handleSubmit = async () => {
    if (!form.client.trim() || !form.description.trim()) return
    setSubmitting(true)
    try {
      const ticket = await createTicket({ type: ticketType, priority: form.priority, category: form.category, client: form.client, client_ref: form.clientRef, email: form.email, description: form.description, fullDescription: form.description, technician_id: form.technician_id || null, zone: form.zone, address: form.address, contract: form.contract, phone: form.phone, estimatedVisit: form.estimatedVisit || null })
      navigate(`/operator/ticket/${ticket.id}`)
    } catch (err) {
      console.error(err)
      setSubmitting(false)
    }
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', fontSize: 13, color: '#1a1a2e', outline: 'none', background: '#fff' }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <TopNav />
      {/* Action bar */}
      <div style={{ height: 40, background: '#fff', borderBottom: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>New Ticket</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate('/operator')} style={{ background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 5, color: '#555', fontSize: 12, cursor: 'pointer', padding: '3px 12px' }}>Cancel</button>
        <button onClick={handleSubmit} disabled={submitting} style={{ background: submitting ? '#555' : '#1a6eb5', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 16px', fontSize: 13, fontWeight: 600, cursor: submitting ? 'default' : 'pointer' }}>
          {submitting ? 'Creating…' : 'Create Ticket'}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '28px 0' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 32px' }}>
          {/* Type selector */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>TICKET TYPE</div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[
                { value: 'problem', icon: '⚠️', label: 'Problem / Incident',  desc: 'Report a service issue or outage' },
                { value: 'install', icon: '📡', label: 'New Installation',    desc: 'Schedule a new service installation' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setTicketType(opt.value)} style={{ flex: 1, background: ticketType === opt.value ? '#fff' : '#f5f5f5', border: `2px solid ${ticketType === opt.value ? '#1a6eb5' : '#e2e8f0'}`, borderRadius: 8, padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                  <span style={{ fontSize: 24 }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: ticketType === opt.value ? '#1a6eb5' : '#555' }}>{opt.label}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#bbb', marginTop: 2 }}>{opt.desc}</div>
                  </div>
                  {ticketType === opt.value && (
                    <div style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: 9, background: '#1a6eb5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {MODULES.map((module, mi) => (
            <div key={mi} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '12px 18px', background: '#fafafa', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{module.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>{module.label}</span>
              </div>
              <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {module.fields.map((field, fi) => (
                  <div key={fi} style={{ gridColumn: field.span === 2 ? '1 / -1' : 'auto' }}>
                    <label style={{ display: 'block', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea value={form[field.key]} onChange={e => update(field.key, e.target.value)} placeholder="Describe the issue..." rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
                    ) : field.type === 'clientSelect' ? (
                      <div style={{ position: 'relative' }}>
                        <input
                          value={form[field.key]}
                          onChange={e => { update(field.key, e.target.value); setShowClientOptions(true) }}
                          onFocus={() => setShowClientOptions(true)}
                          onBlur={pickExactClient}
                          placeholder="Search and select a client"
                          style={inputStyle}
                        />
                        {showClientOptions && clientOptions.length > 0 && (
                          <div style={{ position: 'absolute', top: 38, left: 0, right: 0, background: '#fff', border: '1px solid #dbe4f0', borderRadius: 8, boxShadow: '0 10px 28px rgba(0,0,0,0.14)', zIndex: 20, overflow: 'hidden', maxHeight: 260, overflowY: 'auto' }}>
                            {clientOptions.map(c => (
                              <button
                                key={`${c.ref || c.name}-${c.phone || ''}`}
                                type="button"
                                onMouseDown={e => { e.preventDefault(); selectClient(c) }}
                                style={{ width: '100%', border: 'none', borderBottom: '1px solid #f0f0f0', background: '#fff', padding: '10px 12px', cursor: 'pointer', textAlign: 'left' }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{c.name}</div>
                                <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>
                                  {[c.source === 'dma' ? 'DMA' : '', c.ref, c.phone, c.zone, c.tickets ? `${c.tickets} ticket${c.tickets !== 1 ? 's' : ''}` : ''].filter(Boolean).join(' - ')}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : field.type === 'categorySelect' ? (
                      <select value={form[field.key]} onChange={e => update(field.key, e.target.value)} disabled={ticketType === 'install'} style={{ ...inputStyle, cursor: ticketType === 'install' ? 'default' : 'pointer', background: ticketType === 'install' ? '#f8fafc' : '#fff' }}>
                        {categoryOptions.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    ) : field.type === 'datetime' ? (
                      <input type="datetime-local" value={form[field.key]} onChange={e => update(field.key, e.target.value)} style={inputStyle} />
                    ) : field.type === 'select' ? (
                      <select value={form[field.key]} onChange={e => update(field.key, e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        {field.options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                      </select>
                    ) : field.type === 'techSelect' ? (
                      <select value={form[field.key]} onChange={e => update(field.key, e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="">Unassigned</option>
                        {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    ) : (
                      <input value={form[field.key]} onChange={e => update(field.key, e.target.value)} placeholder="—" style={inputStyle} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
