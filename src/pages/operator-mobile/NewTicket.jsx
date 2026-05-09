import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { createTicket, getTechnicians, getZones, getCategories, searchClients } from '../../data/api'
import { useAuth } from '../../contexts/AuthContext'

const PRIORITIES = [
  { value: 'high', label: 'High',   color: '#e74c3c' },
  { value: 'med',  label: 'Medium', color: '#e67e22' },
  { value: 'low',  label: 'Low',    color: '#27ae60' },
]

const labelStyle = {
  fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, display: 'block',
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0',
  borderRadius: 8, padding: '11px 13px', fontSize: 14, color: '#333',
  outline: 'none', fontFamily: 'inherit', background: '#fff',
}

const errorInputStyle = {
  border: '1.5px solid #e74c3c',
  boxShadow: '0 0 0 3px rgba(231,76,60,0.1)',
}

const INSTALL_CATEGORY_NAME = 'New Installation'
const normalizeCategory = (name) => String(name || '').toLowerCase().replace(/[^a-z]/g, '')
const isInstallCategory = (name) => ['newinstallation', 'newinstalation'].includes(normalizeCategory(name))

export default function MobileNewTicket() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [technicians, setTechnicians] = useState([])
  const [zones, setZones] = useState([])
  const [categories, setCategories] = useState([])
  const [clientOptions, setClientOptions] = useState([])
  const [showClientOptions, setShowClientOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const prefill = location.state || {}

  const [form, setForm] = useState({
    type: 'problem',
    client: prefill.client || '',
    clientRef: '',
    email: '',
    address: '',
    zone: prefill.zone || '',
    phone: prefill.phone || '',
    contract: prefill.contract || '',
    priority: 'med',
    category: '',
    description: '',
    fullDescription: '',
    technician_id: '',
    estimatedVisit: '',
  })
  const installCategory = categories.find(c => isInstallCategory(c.name)) || { id: 'install', name: INSTALL_CATEGORY_NAME }
  const problemCategories = categories.filter(c => !isInstallCategory(c.name))
  const categoryOptions = form.type === 'install'
    ? [installCategory]
    : (problemCategories.length ? problemCategories : [{ id: 'uncategorized', name: 'Uncategorized' }])

  useEffect(() => {
    Promise.all([getTechnicians(), getZones(), getCategories()])
      .then(([techs, zns, cats]) => {
        setTechnicians(techs)
        setZones(zns)
        setCategories(cats)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    const nextCategory = form.type === 'install'
      ? installCategory.name
      : categoryOptions[0]?.name || ''
    setForm(f => categoryOptions.some(c => c.name === f.category) ? f : { ...f, category: nextCategory })
  }, [form.type, categories])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchClients(form.client.trim())
        .then(setClientOptions)
        .catch(console.error)
    }, 250)
    return () => clearTimeout(timer)
  }, [form.client])

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setFieldErrors(errors => ({ ...errors, [k]: '' }))
    setError('')
  }

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
    setFieldErrors(errors => ({ ...errors, client: '' }))
    setError('')
    setShowClientOptions(false)
  }

  const pickExactClient = () => {
    const q = form.client.trim().toLowerCase()
    const found = clientOptions.find(c =>
      c.name?.toLowerCase() === q || c.ref?.toLowerCase() === q
    )
    selectClient(found)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextErrors = {}
    if (!form.client.trim()) nextErrors.client = 'Client is required.'
    if (!form.category.trim()) nextErrors.category = 'Category is required.'
    if (!form.description.trim()) nextErrors.description = 'Description is required.'

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors)
      setError('Please fill the required fields.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const ticket = await createTicket({
        type: form.type,
        priority: form.priority,
        category: form.category,
        client: form.client.trim(),
        client_ref: form.clientRef,
        email: form.email,
        description: form.description.trim(),
        fullDescription: form.fullDescription.trim(),
        technician_id: form.technician_id || null,
        zone: form.zone,
        address: form.address.trim(),
        contract: form.contract.trim(),
        phone: form.phone.trim(),
        estimatedVisit: form.estimatedVisit || null,
      })
      navigate(`/m/ticket/${ticket.id}`)
    } catch (err) {
      setError('Failed to create ticket. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const fieldStyle = key => ({
    ...inputStyle,
    ...(fieldErrors[key] ? errorInputStyle : {}),
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: '#1a1a2e', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => navigate('/m')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>←</button>
        <span style={{ fontWeight: 700, fontSize: 17, color: '#fff' }}>New Ticket</span>
      </div>

      <form onSubmit={handleSubmit} noValidate style={{ flex: 1, overflow: 'auto', padding: '14px 14px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Type */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ ...labelStyle, marginBottom: 10 }}>Ticket Type</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[{ value: 'problem', icon: '⚠️', label: 'Problem' }, { value: 'install', icon: '📡', label: 'Installation' }].map(t => (
              <button key={t.value} type="button" onClick={() => set('type', t.value)}
                style={{ flex: 1, border: `2px solid ${form.type === t.value ? '#1a6eb5' : '#e2e8f0'}`, borderRadius: 10, padding: '14px 8px', textAlign: 'center', background: form.type === t.value ? '#e8f0fb' : '#fff', cursor: 'pointer' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{t.icon}</div>
                <div style={{ fontSize: 13, fontWeight: form.type === t.value ? 700 : 400, color: form.type === t.value ? '#1a6eb5' : '#555' }}>{t.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Client info */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Client Info</div>
          <div style={{ position: 'relative' }}>
            <label style={{ ...labelStyle, color: fieldErrors.client ? '#e74c3c' : labelStyle.color }}>Client Name *</label>
            <input
              value={form.client}
              onChange={e => { set('client', e.target.value); setShowClientOptions(true) }}
              onFocus={() => setShowClientOptions(true)}
              onBlur={pickExactClient}
              placeholder="Search and select a client"
              style={fieldStyle('client')}
            />
            {showClientOptions && clientOptions.length > 0 && (
              <div style={{ position: 'absolute', top: 61, left: 0, right: 0, background: '#fff', border: '1px solid #dbe4f0', borderRadius: 10, boxShadow: '0 10px 28px rgba(0,0,0,0.16)', zIndex: 20, overflow: 'hidden', maxHeight: 260, overflowY: 'auto' }}>
                {clientOptions.map(c => (
                  <button
                    key={`${c.ref || c.name}-${c.phone || ''}`}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); selectClient(c) }}
                    style={{ width: '100%', border: 'none', borderBottom: '1px solid #f0f0f0', background: '#fff', padding: '11px 12px', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>
                      {[c.source === 'dma' ? 'DMA' : '', c.ref, c.phone, c.zone, c.tickets ? `${c.tickets} ticket${c.tickets !== 1 ? 's' : ''}` : ''].filter(Boolean).join(' - ')}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {fieldErrors.client && <div style={{ fontSize: 12, color: '#e74c3c', marginTop: 6 }}>{fieldErrors.client}</div>}
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+213 555 000 000" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Zone</label>
            <select value={form.zone} onChange={e => set('zone', e.target.value)} style={inputStyle}>
              <option value="">— Select zone —</option>
              {zones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Contract</label>
            <input value={form.contract} onChange={e => set('contract', e.target.value)} placeholder="e.g. PRO-FTTH-100M" style={inputStyle} />
          </div>
        </div>

        {/* Problem details */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Details</div>
          <div>
            <label style={labelStyle}>Priority</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {PRIORITIES.map(p => (
                <button key={p.value} type="button" onClick={() => set('priority', p.value)}
                  style={{ flex: 1, border: `2px solid ${form.priority === p.value ? p.color : '#e2e8f0'}`, borderRadius: 8, padding: '9px 4px', textAlign: 'center', background: form.priority === p.value ? p.color + '18' : '#fff', cursor: 'pointer' }}>
                  <div style={{ fontSize: 11, fontWeight: form.priority === p.value ? 700 : 400, color: form.priority === p.value ? p.color : '#888' }}>{p.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ ...labelStyle, color: fieldErrors.category ? '#e74c3c' : labelStyle.color }}>Category *</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} disabled={form.type === 'install'} style={{ ...fieldStyle('category'), background: form.type === 'install' ? '#f8fafc' : '#fff' }}>
              {categoryOptions.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            {fieldErrors.category && <div style={{ fontSize: 12, color: '#e74c3c', marginTop: 6 }}>{fieldErrors.category}</div>}
          </div>
          <div>
            <label style={{ ...labelStyle, color: fieldErrors.description ? '#e74c3c' : labelStyle.color }}>Short Description *</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="One-line summary" style={fieldStyle('description')} />
            {fieldErrors.description && <div style={{ fontSize: 12, color: '#e74c3c', marginTop: 6 }}>{fieldErrors.description}</div>}
          </div>
          <div>
            <label style={labelStyle}>Full Description</label>
            <textarea value={form.fullDescription} onChange={e => set('fullDescription', e.target.value)}
              placeholder="Detailed description of the issue…" rows={4}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} />
          </div>
        </div>

        {/* Assignment */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Assignment</div>
          <div>
            <label style={labelStyle}>Technician</label>
            <select value={form.technician_id} onChange={e => set('technician_id', e.target.value)} style={inputStyle}>
              <option value="">— Unassigned —</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Estimated Visit</label>
            <input type="datetime-local" value={form.estimatedVisit} onChange={e => set('estimatedVisit', e.target.value)} style={inputStyle} />
          </div>
        </div>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => navigate('/m')}
            style={{ flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '13px', fontSize: 14, color: '#555', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            style={{ flex: 2, background: submitting ? '#aaa' : '#1a1a2e', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, color: '#fff', fontWeight: 700, cursor: submitting ? 'default' : 'pointer' }}>
            {submitting ? 'Creating…' : 'Create Ticket'}
          </button>
        </div>

      </form>
    </div>
  )
}
