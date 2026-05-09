import { useState, useEffect } from 'react'
import { getUsers, createUser, updateUser, deleteUser as apiDeleteUser, testDMAConnection, getZones, addZone as apiAddZone, updateZone as apiUpdateZone, deleteZone as apiDeleteZone, getCategories, addCategory as apiAddCategory, updateCategory as apiUpdateCategory, deleteCategory as apiDeleteCategory, getSlaRules, saveSlaRules, getNotifications, saveNotifications, getDMAMapping, saveDMAMapping, getDMAConnection, saveDMAConnection } from '../../data/api'
import { DEFAULT_BRAND_NAME, defaultLogoUrl, getBrandLogoUrl, getBrandName, resetCustomLogo, saveBrandName, saveCustomLogo } from '../../branding'
import BrandLogo from '../../components/BrandLogo'
import TopNav from '../../components/TopNav'

const TABS = [
  {id:'branding',     label:'Branding'},
  {id:'users',        label:'Users'},
  {id:'zones',        label:'Zones'},
  {id:'categories',   label:'Categories'},
  {id:'sla',          label:'SLA Rules'},
  {id:'notif',        label:'Notifications'},
  {id:'integrations', label:'Integrations'},
]


const ROLES = ['operator', 'technician', 'admin']

const inp = {
  border:'1px solid #e2e8f0', borderRadius:6, padding:'7px 10px',
  fontSize:13, color:'#1a1a2e', outline:'none', background:'#fff', width:'100%',
}

const monoLabel = {
  fontFamily:'IBM Plex Mono, monospace', fontSize:9, color:'#aaa',
  textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4,
}

const SETTINGS_TAB_STORAGE_KEY = 'isp_helpdesk_settings_tab'
const isValidTab = id => TABS.some(t => t.id === id)

function getInitialSettingsTab() {
  if (typeof window === 'undefined') return 'branding'
  const hashTab = window.location.hash.replace('#', '')
  if (isValidTab(hashTab)) return hashTab
  const savedTab = localStorage.getItem(SETTINGS_TAB_STORAGE_KEY)
  if (isValidTab(savedTab)) return savedTab
  return 'branding'
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState(getInitialSettingsTab)
  const [brandName, setBrandName] = useState(getBrandName)
  const [brandMessage, setBrandMessage] = useState('')
  const [logoPreview, setLogoPreview] = useState(getBrandLogoUrl)
  const [logoMessage, setLogoMessage] = useState('')
  const [logoError, setLogoError] = useState('')

  useEffect(() => {
    const refreshBranding = () => {
      setLogoPreview(getBrandLogoUrl())
      setBrandName(getBrandName())
    }
    window.addEventListener('storage', refreshBranding)
    return () => window.removeEventListener('storage', refreshBranding)
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      const hashTab = window.location.hash.replace('#', '')
      if (isValidTab(hashTab)) setActiveTab(hashTab)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const selectTab = id => {
    setActiveTab(id)
    localStorage.setItem(SETTINGS_TAB_STORAGE_KEY, id)
    window.history.replaceState(null, '', `#${id}`)
  }

  const updateBrandName = value => {
    setBrandName(value)
    saveBrandName(value)
    setBrandMessage('Name updated.')
    setTimeout(() => setBrandMessage(''), 1600)
  }

  const restoreDefaultBrandName = () => {
    updateBrandName(DEFAULT_BRAND_NAME)
  }

  const handleLogoUpload = e => {
    const file = e.target.files?.[0]
    if (!file) return

    setLogoMessage('')
    setLogoError('')

    if (!file.type.startsWith('image/')) {
      setLogoError('Please choose an image file.')
      return
    }

    if (file.size > 1500 * 1024) {
      setLogoError('Choose an image under 1.5 MB so it can be saved in this browser.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      saveCustomLogo(dataUrl)
      setLogoPreview(dataUrl)
      setLogoMessage('Logo updated.')
      e.target.value = ''
    }
    reader.onerror = () => setLogoError('Could not read that image. Try another file.')
    reader.readAsDataURL(file)
  }

  const restoreDefaultLogo = () => {
    resetCustomLogo()
    setLogoPreview(defaultLogoUrl)
    setLogoError('')
    setLogoMessage('Default logo restored.')
  }

  // ── Users ──
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [addingUser, setAddingUser] = useState(false)
  const [newUser, setNewUser] = useState({name:'', username:'', email:'', phone:'', role:'operator', status:'active', password:'', confirmPassword:''})
  const [newUserPwdError, setNewUserPwdError] = useState('')
  const [editingUser, setEditingUser] = useState(null)
  const [editUserData, setEditUserData] = useState({})
  const [pwdError, setPwdError] = useState('')

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setUsersLoading(false))
  }, [])

  const saveNewUser = async () => {
    if (!newUser.name.trim()) return
    if (newUser.password !== newUser.confirmPassword) { setNewUserPwdError('Passwords do not match'); return }
    if (newUser.password.length < 6) { setNewUserPwdError('Password must be at least 6 characters'); return }
    setNewUserPwdError('')
    try {
      const created = await createUser({ username: newUser.username, name: newUser.name, role: newUser.role, status: newUser.status, password: newUser.password })
      setUsers(us => [...us, created])
      setNewUser({name:'', username:'', email:'', phone:'', role:'operator', status:'active', password:'', confirmPassword:''})
      setAddingUser(false)
    } catch (err) {
      setNewUserPwdError(err.message)
    }
  }

  const startEditUser = u => {
    setEditingUser(u.id)
    setPwdError('')
    setEditUserData({name: u.name, username: u.username || '', email: u.email || '', phone: u.phone || '', role: u.role, status: u.status, newPassword: '', confirmPassword: ''})
  }

  const saveEditUser = async id => {
    if (!editUserData.name.trim()) return
    if (editUserData.newPassword || editUserData.confirmPassword) {
      if (editUserData.newPassword !== editUserData.confirmPassword) { setPwdError('Passwords do not match'); return }
      if (editUserData.newPassword.length < 6) { setPwdError('Password must be at least 6 characters'); return }
    }
    setPwdError('')
    const { newPassword, confirmPassword, ...profile } = editUserData
    const payload = { ...profile }
    if (newPassword) payload.password = newPassword
    try {
      await updateUser(id, payload)
      setUsers(us => us.map(u => u.id === id ? {...u, ...profile} : u))
      setEditingUser(null)
    } catch (err) {
      setPwdError(err.message)
    }
  }

  const deleteUser = async id => {
    try {
      await apiDeleteUser(id)
      setUsers(us => us.filter(u => u.id !== id))
      setDeletingUser(null)
    } catch (err) {
      console.error(err)
    }
  }

  const [deletingUser, setDeletingUser] = useState(null)

  // ── Zones ──
  const [zones, setZones] = useState([])
  const [addingZone, setAddingZone] = useState(false)
  const [newZone, setNewZone] = useState('')
  const [editingZone, setEditingZone] = useState(null)
  const [editZoneVal, setEditZoneVal] = useState('')
  const [deletingZone, setDeletingZone] = useState(null)

  useEffect(() => { getZones().then(setZones).catch(console.error) }, [])

  const addZone = async () => {
    if (!newZone.trim()) return
    try {
      const created = await apiAddZone({ name: newZone.trim() })
      setZones(z => [...z, created])
      setNewZone(''); setAddingZone(false)
    } catch (err) { console.error(err) }
  }
  const saveZone = async id => {
    if (!editZoneVal.trim()) return
    try {
      await apiUpdateZone(id, { name: editZoneVal.trim() })
      setZones(z => z.map(v => v.id === id ? {...v, name: editZoneVal.trim()} : v))
      setEditingZone(null)
    } catch (err) { console.error(err) }
  }
  const deleteZone = async id => {
    try {
      await apiDeleteZone(id)
      setZones(z => z.filter(v => v.id !== id))
      setDeletingZone(null)
    } catch (err) { console.error(err) }
  }

  // ── Categories ──
  const [categories, setCategories] = useState([])
  const [addingCat, setAddingCat] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [editingCat, setEditingCat] = useState(null)
  const [editCatVal, setEditCatVal] = useState('')
  const [deletingCat, setDeletingCat] = useState(null)

  useEffect(() => { getCategories().then(setCategories).catch(console.error) }, [])

  const addCat = async () => {
    if (!newCat.trim()) return
    try {
      const created = await apiAddCategory({ name: newCat.trim() })
      setCategories(c => [...c, created])
      setNewCat(''); setAddingCat(false)
    } catch (err) { console.error(err) }
  }
  const saveCat = async id => {
    if (!editCatVal.trim()) return
    try {
      await apiUpdateCategory(id, { name: editCatVal.trim() })
      setCategories(c => c.map(v => v.id === id ? {...v, name: editCatVal.trim()} : v))
      setEditingCat(null)
    } catch (err) { console.error(err) }
  }
  const deleteCat = async id => {
    try {
      await apiDeleteCategory(id)
      setCategories(c => c.filter(v => v.id !== id))
      setDeletingCat(null)
    } catch (err) { console.error(err) }
  }

  // ── SLA ──
  const [sla, setSla] = useState([])
  const [slaSaved, setSlaSaved] = useState(false)

  useEffect(() => { getSlaRules().then(setSla).catch(console.error) }, [])

  const updateSla = (i, field, val) =>
    setSla(rules => rules.map((r, j) => j === i ? {...r, [field]: val} : r))

  const saveSla = async () => {
    try {
      await saveSlaRules(sla)
      setSlaSaved(true)
      setTimeout(() => setSlaSaved(false), 2000)
    } catch (err) { console.error(err) }
  }

  // ── Notifications ──
  const [notifs, setNotifs] = useState([])

  useEffect(() => { getNotifications().then(setNotifs).catch(console.error) }, [])

  const toggleNotif = async i => {
    const updated = notifs.map((n, j) => j === i ? {...n, enabled: !n.enabled} : n)
    setNotifs(updated)
    try { await saveNotifications(updated) } catch (err) { console.error(err) }
  }

  // ── DMA Softlab integration ──
  const [dmaConn, setDmaConn] = useState(() => {
    try {
      const saved = localStorage.getItem('dma_connection')
      if (saved) return JSON.parse(saved)
    } catch {}
    return { host: '', port: '3306', database: '', user: '', password: '', table: 'clients' }
  })
  const [showPass, setShowPass] = useState(false)
  const [dmaStatus, setDmaStatus] = useState('idle') // idle | connecting | connected | error
  const [dmaError, setDmaError] = useState('')
  const [hasSavedDmaPassword, setHasSavedDmaPassword] = useState(false)
  const [dmaMapping, setDmaMapping] = useState({ ref: 'username', firstName: 'name', lastName: 'surname', phone: 'phone', mobile: 'mobile', zone: 'location' })
  const [mappingSaved, setMappingSaved] = useState(false)

  useEffect(() => {
    getDMAMapping()
      .then(setDmaMapping)
      .catch(console.error)
    getDMAConnection()
      .then(saved => {
        if (!saved?.host) return
        setHasSavedDmaPassword(Boolean(saved.hasPassword))
        setDmaConn(current => ({
          ...current,
          host: saved.host || current.host,
          port: String(saved.port || current.port || '3306'),
          database: saved.database || current.database,
          user: saved.user || current.user,
          table: saved.table || current.table || 'clients',
        }))
        if (saved.hasPassword) {
          setDmaStatus('connected')
        } else {
          setDmaStatus('idle')
          setDmaError('DMA password is missing. Enter it and connect again.')
        }
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    localStorage.setItem('dma_connection', JSON.stringify(dmaConn))
  }, [dmaConn])

  const setDma = (field, val) => setDmaConn(c => ({ ...c, [field]: val }))
  const dmaReady = dmaConn.host.trim() && dmaConn.database.trim() && dmaConn.user.trim()

  const connectDMA = async () => {
    if (!dmaReady) return
    setDmaStatus('connecting')
    setDmaError('')
    try {
      await testDMAConnection(dmaConn)
      await saveDMAConnection(dmaConn)
      setHasSavedDmaPassword(true)
      setDmaStatus('connected')
    } catch (err) {
      setDmaStatus('error')
      setDmaError(err.message)
    }
  }

  const disconnectDMA = () => {
    setDmaStatus('idle')
    setDmaError('')
  }

  const saveMapping = async () => {
    try {
      await saveDMAMapping(dmaMapping)
      setMappingSaved(true)
      setTimeout(() => setMappingSaved(false), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div style={{height:'100vh', display:'flex', flexDirection:'column', background:'#f8fafc'}}>
      <TopNav />

      <div style={{flex:1, overflow:'hidden', display:'flex', flexDirection:'column'}}>
        {/* Tab bar */}
        <div style={{display:'flex', borderBottom:'1px solid #e8e8e8', padding:'0 20px', background:'#fff', gap:4, flexShrink:0}}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => selectTab(t.id)} style={{
              padding:'12px 16px', cursor:'pointer', fontSize:13, background:'none', border:'none',
              fontWeight: activeTab===t.id ? 600 : 400,
              color: activeTab===t.id ? '#1a1a2e' : '#888',
              borderBottom: activeTab===t.id ? '2px solid #1a1a2e' : '2px solid transparent',
              marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{flex:1, overflow:'auto', padding:24}}>

          {/* Branding */}
          {activeTab === 'branding' && (
            <div style={{maxWidth:700}}>
              <div style={{fontSize:16, fontWeight:600, color:'#1a1a2e', marginBottom:4}}>Branding</div>
              <div style={{fontSize:13, color:'#888', marginBottom:20}}>Update the app name and logo for the header, login screens, and browser tab.</div>

              <div style={{background:'#fff', border:'1px solid #e8e8e8', borderRadius:8, overflow:'hidden'}}>
                <div style={{padding:20, borderBottom:'1px solid #f0f0f0'}}>
                  <div style={{display:'grid', gridTemplateColumns:'1fr auto', gap:12, alignItems:'end'}}>
                    <div>
                      <div style={monoLabel}>App Name</div>
                      <input value={brandName} onChange={e => updateBrandName(e.target.value)}
                        placeholder="ISP DESK" style={inp} />
                    </div>
                    <button onClick={restoreDefaultBrandName}
                      style={{background:'none', border:'1px solid #e2e8f0', borderRadius:6, padding:'7px 14px', fontSize:13, color:'#555', cursor:'pointer'}}>
                      Restore Name
                    </button>
                  </div>
                  {brandMessage && <div style={{fontSize:13, color:'#27ae60', fontWeight:600, marginTop:8}}>{brandMessage}</div>}
                </div>

                <div style={{padding:20, borderBottom:'1px solid #f0f0f0'}}>
                  <div style={{display:'grid', gridTemplateColumns:'160px 1fr', gap:20, alignItems:'center'}}>
                    <div style={{height:120, border:'1px solid #e8e8e8', borderRadius:8, background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center'}}>
                      <img src={logoPreview} alt="Current logo preview" style={{width:104, height:104, objectFit:'contain'}} />
                    </div>
                    <div>
                      <div style={monoLabel}>Current Brand</div>
                      <div style={{background:'#1a1a2e', borderRadius:8, padding:'14px 16px', marginBottom:12}}>
                        <BrandLogo size={48} compact subtitle="Technical Management System" />
                      </div>
                      <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                        <label htmlFor="logo-upload" style={{background:'#1a1a2e', color:'#fff', border:'none', borderRadius:6, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer'}}>
                          Upload Logo
                        </label>
                        <input id="logo-upload" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} style={{display:'none'}} />
                        <button onClick={restoreDefaultLogo}
                          style={{background:'none', border:'1px solid #e2e8f0', borderRadius:6, padding:'7px 14px', fontSize:13, color:'#555', cursor:'pointer'}}>
                          Restore Default
                        </button>
                        {logoMessage && <span style={{fontSize:13, color:'#27ae60', fontWeight:600}}>{logoMessage}</span>}
                      </div>
                      {logoError && <div style={{fontSize:12, color:'#e74c3c', marginTop:10}}>{logoError}</div>}
                    </div>
                  </div>
                </div>

                <div style={{padding:20}}>
                  <div style={{fontSize:13, fontWeight:600, color:'#1a1a2e', marginBottom:10}}>Browser Tab</div>
                  <div style={{display:'flex', alignItems:'center', gap:10, border:'1px solid #e8e8e8', borderRadius:8, padding:'10px 12px', maxWidth:300}}>
                    <img src={logoPreview} alt="Favicon preview" style={{width:22, height:22, objectFit:'contain'}} />
                    <span style={{fontSize:13, color:'#333'}}>{brandName.trim() || DEFAULT_BRAND_NAME}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────── USERS ──────── */}
          {activeTab === 'users' && (
            <div style={{maxWidth:740}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                <div style={{fontSize:16, fontWeight:600, color:'#1a1a2e'}}>User Management</div>
                <button
                  onClick={() => { setAddingUser(true); setEditingUser(null) }}
                  style={{background:'#1a1a2e', color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', fontSize:13, fontWeight:600, cursor:'pointer'}}>
                  + Add User
                </button>
              </div>

              {/* Add user panel */}
              {addingUser && (
                <div style={{background:'#fff', border:'1px solid #1a6eb5', borderRadius:8, padding:16, marginBottom:12}}>
                  <div style={{fontSize:13, fontWeight:600, color:'#1a1a2e', marginBottom:12}}>New User</div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12}}>
                    <div>
                      <div style={monoLabel}>Full Name</div>
                      <input autoFocus value={newUser.name} onChange={e => setNewUser(u => ({...u, name:e.target.value}))}
                        placeholder="Full name" style={inp} />
                    </div>
                    <div>
                      <div style={monoLabel}>Username</div>
                      <input value={newUser.username} onChange={e => setNewUser(u => ({...u, username:e.target.value}))}
                        placeholder="@username" style={inp} />
                    </div>
                    <div>
                      <div style={monoLabel}>Email</div>
                      <input type="email" value={newUser.email} onChange={e => setNewUser(u => ({...u, email:e.target.value}))}
                        placeholder="email@example.com" style={inp} />
                    </div>
                    <div>
                      <div style={monoLabel}>Phone Number</div>
                      <input type="tel" value={newUser.phone} onChange={e => setNewUser(u => ({...u, phone:e.target.value}))}
                        placeholder="+1 555 000 0000" style={inp} />
                    </div>
                    <div>
                      <div style={monoLabel}>Role</div>
                      <select value={newUser.role} onChange={e => setNewUser(u => ({...u, role:e.target.value}))}
                        style={{...inp, cursor:'pointer'}}>
                        {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={monoLabel}>Status</div>
                      <select value={newUser.status} onChange={e => setNewUser(u => ({...u, status:e.target.value}))}
                        style={{...inp, cursor:'pointer'}}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <div style={monoLabel}>Password *</div>
                      <input type="password" value={newUser.password} onChange={e => { setNewUser(u => ({...u, password:e.target.value})); setNewUserPwdError('') }}
                        placeholder="Min. 6 characters" style={inp} />
                    </div>
                    <div>
                      <div style={monoLabel}>Confirm Password *</div>
                      <input type="password" value={newUser.confirmPassword} onChange={e => { setNewUser(u => ({...u, confirmPassword:e.target.value})); setNewUserPwdError('') }}
                        placeholder="Repeat password" style={inp} />
                    </div>
                  </div>
                  {newUserPwdError && <div style={{fontSize:12, color:'#e74c3c', marginBottom:8}}>{newUserPwdError}</div>}
                  <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
                    <button onClick={() => { setAddingUser(false); setNewUserPwdError('') }}
                      style={{background:'none', border:'1px solid #e2e8f0', borderRadius:6, padding:'6px 14px', fontSize:13, color:'#555', cursor:'pointer'}}>
                      Cancel
                    </button>
                    <button onClick={saveNewUser}
                      style={{background:'#1a1a2e', color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', fontSize:13, fontWeight:600, cursor:'pointer'}}>
                      Save User
                    </button>
                  </div>
                </div>
              )}

              <div style={{background:'#fff', border:'1px solid #e8e8e8', borderRadius:8, overflow:'hidden'}}>
                <div style={{display:'grid', gridTemplateColumns:'1fr 180px 100px 80px 150px', padding:'8px 16px', background:'#fafafa', borderBottom:'1px solid #eee'}}>
                  {['Name / Username', 'Contact', 'Role', 'Status', ''].map(h => (
                    <div key={h} style={{fontFamily:'IBM Plex Mono, monospace', fontSize:9, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.08em'}}>{h}</div>
                  ))}
                </div>

                {usersLoading && <div style={{padding:32, textAlign:'center', color:'#aaa', fontSize:14}}>Loading…</div>}

                {!usersLoading && users.map((u, i) =>
                  deletingUser === u.id ? (
                    <div key={u.id} style={{padding:'14px 16px', borderBottom:i<users.length-1?'1px solid #e8e8e8':'none', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff8f8'}}>
                      <span style={{fontSize:13, color:'#e74c3c'}}>Delete "{u.name}"?</span>
                      <div style={{display:'flex', gap:8}}>
                        <button onClick={() => setDeletingUser(null)}
                          style={{background:'none', border:'1px solid #e2e8f0', borderRadius:6, padding:'4px 10px', fontSize:12, color:'#555', cursor:'pointer'}}>
                          Cancel
                        </button>
                        <button onClick={() => deleteUser(u.id)}
                          style={{background:'#e74c3c', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:600, cursor:'pointer'}}>
                          Confirm Delete
                        </button>
                      </div>
                    </div>
                  ) : editingUser === u.id ? (
                    /* Edit panel — full width, same style as Add panel */
                    <div key={u.id} style={{padding:16, borderBottom:i<users.length-1?'1px solid #e8e8e8':'none', background:'#f8fbff'}}>
                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12}}>
                        <div>
                          <div style={monoLabel}>Full Name</div>
                          <input autoFocus value={editUserData.name} onChange={e => setEditUserData(d => ({...d, name:e.target.value}))} style={inp} />
                        </div>
                        <div>
                          <div style={monoLabel}>Username</div>
                          <input value={editUserData.username} onChange={e => setEditUserData(d => ({...d, username:e.target.value}))} placeholder="@username" style={inp} />
                        </div>
                        <div>
                          <div style={monoLabel}>Email</div>
                          <input type="email" value={editUserData.email} onChange={e => setEditUserData(d => ({...d, email:e.target.value}))} placeholder="email@example.com" style={inp} />
                        </div>
                        <div>
                          <div style={monoLabel}>Phone Number</div>
                          <input type="tel" value={editUserData.phone} onChange={e => setEditUserData(d => ({...d, phone:e.target.value}))} placeholder="+1 555 000 0000" style={inp} />
                        </div>
                        <div>
                          <div style={monoLabel}>Role</div>
                          <select value={editUserData.role} onChange={e => setEditUserData(d => ({...d, role:e.target.value}))} style={{...inp, cursor:'pointer'}}>
                            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                          </select>
                        </div>
                        <div>
                          <div style={monoLabel}>Status</div>
                          <select value={editUserData.status} onChange={e => setEditUserData(d => ({...d, status:e.target.value}))} style={{...inp, cursor:'pointer'}}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                        <div>
                          <div style={monoLabel}>New Password</div>
                          <input type="password" value={editUserData.newPassword} onChange={e => { setEditUserData(d => ({...d, newPassword:e.target.value})); setPwdError('') }}
                            placeholder="Leave blank to keep current" style={inp} />
                        </div>
                        <div>
                          <div style={monoLabel}>Confirm Password</div>
                          <input type="password" value={editUserData.confirmPassword} onChange={e => { setEditUserData(d => ({...d, confirmPassword:e.target.value})); setPwdError('') }}
                            placeholder="Repeat new password" style={inp} />
                        </div>
                      </div>
                      {pwdError && <div style={{fontSize:12, color:'#e74c3c', marginBottom:8}}>{pwdError}</div>}
                      <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
                        <button onClick={() => { setEditingUser(null); setPwdError('') }}
                          style={{background:'none', border:'1px solid #e2e8f0', borderRadius:6, padding:'6px 14px', fontSize:13, color:'#555', cursor:'pointer'}}>
                          Cancel
                        </button>
                        <button onClick={() => saveEditUser(u.id)}
                          style={{background:'#1a1a2e', color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', fontSize:13, fontWeight:600, cursor:'pointer'}}>
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={u.id} style={{display:'grid', gridTemplateColumns:'1fr 180px 100px 80px 150px', padding:'12px 16px', borderBottom:i<users.length-1?'1px solid #f5f5f5':'none', alignItems:'center'}}>
                      <div style={{display:'flex', alignItems:'center', gap:10}}>
                        <div style={{width:28, height:28, borderRadius:14, background:'#d0ddf0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#1a6eb5', flexShrink:0}}>
                          {u.name.split(' ').map(w => w[0]).join('').slice(0,2)}
                        </div>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:13, fontWeight:500, color:'#1a1a2e'}}>{u.name}</div>
                          {u.username && <div style={{fontSize:11, color:'#1a6eb5'}}>@{u.username.replace(/^@/, '')}</div>}
                        </div>
                      </div>
                      <div style={{minWidth:0}}>
                        {u.email && <div style={{fontSize:12, color:'#555', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{u.email}</div>}
                        {u.phone && <div style={{fontSize:11, color:'#aaa'}}>{u.phone}</div>}
                      </div>
                      <div style={{fontSize:12, color:'#555', textTransform:'capitalize'}}>{u.role}</div>
                      <div style={{display:'flex', alignItems:'center', gap:5}}>
                        <div style={{width:7, height:7, borderRadius:4, background:u.status==='active'?'#27ae60':'#ccc'}}/>
                        <span style={{fontSize:12, color:u.status==='active'?'#27ae60':'#aaa'}}>{u.status}</span>
                      </div>
                      <div style={{display:'flex', gap:6}}>
                        <button onClick={() => { startEditUser(u); setDeletingUser(null) }}
                          style={{background:'none', border:'1px solid #e2e8f0', borderRadius:6, padding:'3px 10px', fontSize:12, color:'#555', cursor:'pointer'}}>
                          Edit
                        </button>
                        <button onClick={() => { setDeletingUser(u.id); setEditingUser(null) }}
                          style={{background:'none', border:'1px solid #fcd5d5', borderRadius:6, padding:'3px 10px', fontSize:12, color:'#e74c3c', cursor:'pointer'}}>
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* ──────── ZONES ──────── */}
          {activeTab === 'zones' && (
            <div style={{maxWidth:600}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                <div style={{fontSize:16, fontWeight:600, color:'#1a1a2e'}}>Zone Management</div>
                <button onClick={() => { setAddingZone(true); setEditingZone(null); setDeletingZone(null) }}
                  style={{background:'#1a1a2e', color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', fontSize:13, fontWeight:600, cursor:'pointer'}}>
                  + Add Zone
                </button>
              </div>

              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {zones.map((z) => (
                  <div key={z.id} style={{background:'#fff', border:'1px solid #e8e8e8', borderRadius:8, padding:'14px 16px'}}>
                    {deletingZone === z.id ? (
                      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                        <span style={{fontSize:13, color:'#e74c3c'}}>Delete "{z.name}"?</span>
                        <div style={{display:'flex', gap:8}}>
                          <button onClick={() => setDeletingZone(null)}
                            style={{background:'none', border:'1px solid #e2e8f0', borderRadius:6, padding:'4px 10px', fontSize:12, color:'#555', cursor:'pointer'}}>
                            Cancel
                          </button>
                          <button onClick={() => deleteZone(z.id)}
                            style={{background:'#e74c3c', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:600, cursor:'pointer'}}>
                            Confirm Delete
                          </button>
                        </div>
                      </div>
                    ) : editingZone === z.id ? (
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <input autoFocus value={editZoneVal} onChange={e => setEditZoneVal(e.target.value)}
                          style={{...inp, flex:1}}
                          onKeyDown={e => { if (e.key==='Enter') saveZone(z.id); if (e.key==='Escape') setEditingZone(null) }} />
                        <button onClick={() => saveZone(z.id)}
                          style={{background:'#1a1a2e', color:'#fff', border:'none', borderRadius:6, padding:'5px 14px', fontSize:13, fontWeight:600, cursor:'pointer'}}>
                          Save
                        </button>
                        <button onClick={() => setEditingZone(null)}
                          style={{background:'none', border:'1px solid #e2e8f0', borderRadius:6, padding:'5px 10px', fontSize:12, color:'#555', cursor:'pointer'}}>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                        <div style={{display:'flex', alignItems:'center', gap:10}}>
                          <div style={{width:10, height:10, borderRadius:2, background:'#1a6eb5'}}/>
                          <span style={{fontSize:14, fontWeight:500, color:'#1a1a2e'}}>{z.name}</span>
                        </div>
                        <div style={{display:'flex', gap:8}}>
                          <button onClick={() => { setEditingZone(z.id); setEditZoneVal(z.name); setDeletingZone(null) }}
                            style={{background:'none', border:'1px solid #e2e8f0', borderRadius:6, padding:'4px 10px', fontSize:12, color:'#555', cursor:'pointer'}}>
                            Edit
                          </button>
                          <button onClick={() => { setDeletingZone(z.id); setEditingZone(null) }}
                            style={{background:'none', border:'1px solid #fcd5d5', borderRadius:6, padding:'4px 10px', fontSize:12, color:'#e74c3c', cursor:'pointer'}}>
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {addingZone && (
                  <div style={{background:'#fff', border:'1px solid #1a6eb5', borderRadius:8, padding:'14px 16px', display:'flex', alignItems:'center', gap:8}}>
                    <input autoFocus value={newZone} onChange={e => setNewZone(e.target.value)}
                      placeholder="Zone name (e.g. Zone 6 — East)"
                      style={{...inp, flex:1}}
                      onKeyDown={e => { if (e.key==='Enter') addZone(); if (e.key==='Escape') setAddingZone(false) }} />
                    <button onClick={addZone}
                      style={{background:'#1a1a2e', color:'#fff', border:'none', borderRadius:6, padding:'5px 14px', fontSize:13, fontWeight:600, cursor:'pointer'}}>
                      Add
                    </button>
                    <button onClick={() => setAddingZone(false)}
                      style={{background:'none', border:'1px solid #e2e8f0', borderRadius:6, padding:'5px 10px', fontSize:12, color:'#555', cursor:'pointer'}}>
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────── CATEGORIES ──────── */}
          {activeTab === 'categories' && (
            <div style={{maxWidth:600}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                <div style={{fontSize:16, fontWeight:600, color:'#1a1a2e'}}>Ticket Categories</div>
                <button onClick={() => { setAddingCat(true); setEditingCat(null); setDeletingCat(null) }}
                  style={{background:'#1a1a2e', color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', fontSize:13, fontWeight:600, cursor:'pointer'}}>
                  + Add Category
                </button>
              </div>

              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {categories.map((c) => (
                  <div key={c.id} style={{background:'#fff', border:'1px solid #e8e8e8', borderRadius:8, padding:'14px 16px'}}>
                    {deletingCat === c.id ? (
                      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                        <span style={{fontSize:13, color:'#e74c3c'}}>Delete "{c.name}"?</span>
                        <div style={{display:'flex', gap:8}}>
                          <button onClick={() => setDeletingCat(null)}
                            style={{background:'none', border:'1px solid #e2e8f0', borderRadius:6, padding:'4px 10px', fontSize:12, color:'#555', cursor:'pointer'}}>
                            Cancel
                          </button>
                          <button onClick={() => deleteCat(c.id)}
                            style={{background:'#e74c3c', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:600, cursor:'pointer'}}>
                            Confirm Delete
                          </button>
                        </div>
                      </div>
                    ) : editingCat === c.id ? (
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <input autoFocus value={editCatVal} onChange={e => setEditCatVal(e.target.value)}
                          style={{...inp, flex:1}}
                          onKeyDown={e => { if (e.key==='Enter') saveCat(c.id); if (e.key==='Escape') setEditingCat(null) }} />
                        <button onClick={() => saveCat(c.id)}
                          style={{background:'#1a1a2e', color:'#fff', border:'none', borderRadius:6, padding:'5px 14px', fontSize:13, fontWeight:600, cursor:'pointer'}}>
                          Save
                        </button>
                        <button onClick={() => setEditingCat(null)}
                          style={{background:'none', border:'1px solid #e2e8f0', borderRadius:6, padding:'5px 10px', fontSize:12, color:'#555', cursor:'pointer'}}>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                        <span style={{fontSize:14, fontWeight:500, color:'#1a1a2e'}}>{c.name}</span>
                        <div style={{display:'flex', gap:8}}>
                          <button onClick={() => { setEditingCat(c.id); setEditCatVal(c.name); setDeletingCat(null) }}
                            style={{background:'none', border:'1px solid #e2e8f0', borderRadius:6, padding:'4px 10px', fontSize:12, color:'#555', cursor:'pointer'}}>
                            Edit
                          </button>
                          <button onClick={() => { setDeletingCat(c.id); setEditingCat(null) }}
                            style={{background:'none', border:'1px solid #fcd5d5', borderRadius:6, padding:'4px 10px', fontSize:12, color:'#e74c3c', cursor:'pointer'}}>
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {addingCat && (
                  <div style={{background:'#fff', border:'1px solid #1a6eb5', borderRadius:8, padding:'14px 16px', display:'flex', alignItems:'center', gap:8}}>
                    <input autoFocus value={newCat} onChange={e => setNewCat(e.target.value)}
                      placeholder="Category name (e.g. Router Issue)"
                      style={{...inp, flex:1}}
                      onKeyDown={e => { if (e.key==='Enter') addCat(); if (e.key==='Escape') setAddingCat(false) }} />
                    <button onClick={addCat}
                      style={{background:'#1a1a2e', color:'#fff', border:'none', borderRadius:6, padding:'5px 14px', fontSize:13, fontWeight:600, cursor:'pointer'}}>
                      Add
                    </button>
                    <button onClick={() => setAddingCat(false)}
                      style={{background:'none', border:'1px solid #e2e8f0', borderRadius:6, padding:'5px 10px', fontSize:12, color:'#555', cursor:'pointer'}}>
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────── SLA RULES ──────── */}
          {activeTab === 'sla' && (
            <div style={{maxWidth:600}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                <div style={{fontSize:16, fontWeight:600, color:'#1a1a2e'}}>SLA Rules</div>
                {slaSaved && <span style={{fontSize:13, color:'#27ae60', fontWeight:600}}>✓ Saved</span>}
              </div>
              {sla.map((r, i) => (
                <div key={r.id} style={{background:'#fff', border:'1px solid #e8e8e8', borderRadius:8, padding:16, marginBottom:10}}>
                  <div style={{fontWeight:600, color:'#1a1a2e', marginBottom:12}}>{r.priority_type}</div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                    <div>
                      <div style={{...monoLabel, marginBottom:5}}>Resolution Target (hours)</div>
                      <input type="number" min="1" value={r.target_hours}
                        onChange={e => updateSla(i, 'target_hours', e.target.value)} style={inp} />
                    </div>
                    <div>
                      <div style={{...monoLabel, marginBottom:5}}>Escalate After (hours)</div>
                      <input type="number" min="1" value={r.escalate_hours}
                        onChange={e => updateSla(i, 'escalate_hours', e.target.value)} style={inp} />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={saveSla}
                style={{background:'#1a1a2e', color:'#fff', border:'none', borderRadius:6, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer', marginTop:4}}>
                Save Rules
              </button>
            </div>
          )}

          {/* ──────── NOTIFICATIONS ──────── */}
          {activeTab === 'notif' && (
            <div style={{maxWidth:600}}>
              <div style={{fontSize:16, fontWeight:600, color:'#1a1a2e', marginBottom:16}}>Notification Settings</div>
              <div style={{background:'#fff', border:'1px solid #e8e8e8', borderRadius:8, overflow:'hidden'}}>
                {notifs.map((n, i) => (
                  <div key={n.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:i<notifs.length-1?'1px solid #f0f0f0':'none'}}>
                    <span style={{fontSize:13, color:'#333'}}>{n.label}</span>
                    <button onClick={() => toggleNotif(i)} style={{
                      width:40, height:22, borderRadius:11,
                      background: n.enabled ? '#1a6eb5' : '#ddd',
                      position:'relative', cursor:'pointer', border:'none',
                      transition:'background 0.2s', flexShrink:0,
                    }}>
                      <div style={{
                        width:16, height:16, borderRadius:8, background:'#fff',
                        position:'absolute', top:3, left: n.enabled ? 20 : 3,
                        transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
                      }}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ──────── INTEGRATIONS ──────── */}
          {activeTab === 'integrations' && (
            <div style={{maxWidth:600}}>
              <div style={{fontSize:16, fontWeight:600, color:'#1a1a2e', marginBottom:4}}>Integrations</div>
              <div style={{fontSize:13, color:'#888', marginBottom:20}}>Connect external systems to sync data with {brandName.trim() || DEFAULT_BRAND_NAME}.</div>

              {/* DMA Softlab card */}
              <div style={{background:'#fff', border:'1px solid #e8e8e8', borderRadius:8, overflow:'hidden'}}>
                {/* Card header */}
                <div style={{padding:'16px 20px', borderBottom:'1px solid #f0f0f0', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                  <div style={{display:'flex', alignItems:'center', gap:12}}>
                    <div style={{width:36, height:36, borderRadius:8, background:'#1a1a2e', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                      <span style={{color:'#fff', fontSize:13, fontWeight:700, fontFamily:'IBM Plex Mono, monospace'}}>DMA</span>
                    </div>
                    <div>
                      <div style={{fontSize:14, fontWeight:600, color:'#1a1a2e'}}>DMA Softlab</div>
                      <div style={{fontSize:12, color:'#888'}}>Direct MariaDB connection · searchable during ticket creation</div>
                    </div>
                  </div>
                  {/* Status badge */}
                  {dmaStatus === 'connected' && (
                    <div style={{display:'flex', alignItems:'center', gap:6, background:'#edfaf2', border:'1px solid #b7ecd0', borderRadius:20, padding:'4px 12px'}}>
                      <div style={{width:7, height:7, borderRadius:4, background:'#27ae60'}}/>
                      <span style={{fontSize:12, color:'#27ae60', fontWeight:600}}>Connected</span>
                    </div>
                  )}
                  {dmaStatus === 'error' && (
                    <div style={{display:'flex', alignItems:'center', gap:6, background:'#fff5f5', border:'1px solid #fcd5d5', borderRadius:20, padding:'4px 12px'}}>
                      <div style={{width:7, height:7, borderRadius:4, background:'#e74c3c'}}/>
                      <span style={{fontSize:12, color:'#e74c3c', fontWeight:600}}>Error</span>
                    </div>
                  )}
                  {(dmaStatus === 'idle' || dmaStatus === 'connecting') && (
                    <div style={{display:'flex', alignItems:'center', gap:6, background:'#f5f5f5', border:'1px solid #e0e0e0', borderRadius:20, padding:'4px 12px'}}>
                      <div style={{width:7, height:7, borderRadius:4, background:'#bbb'}}/>
                      <span style={{fontSize:12, color:'#888', fontWeight:600}}>Not connected</span>
                    </div>
                  )}
                </div>

                {/* Connection form */}
                <div style={{padding:'20px'}}>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
                    <div style={{gridColumn:'1 / -1'}}>
                      <div style={monoLabel}>Host / IP Address</div>
                      <input
                        value={dmaConn.host}
                        onChange={e => setDma('host', e.target.value)}
                        placeholder="192.168.1.10 or db.example.com"
                        disabled={dmaStatus === 'connected'}
                        style={{...inp, opacity: dmaStatus === 'connected' ? 0.6 : 1}}
                      />
                    </div>
                    <div>
                      <div style={monoLabel}>Port</div>
                      <input
                        value={dmaConn.port}
                        onChange={e => setDma('port', e.target.value)}
                        placeholder="3306"
                        disabled={dmaStatus === 'connected'}
                        style={{...inp, opacity: dmaStatus === 'connected' ? 0.6 : 1}}
                      />
                    </div>
                    <div>
                      <div style={monoLabel}>Database Name</div>
                      <input
                        value={dmaConn.database}
                        onChange={e => setDma('database', e.target.value)}
                        placeholder="dma_softlab"
                        disabled={dmaStatus === 'connected'}
                        style={{...inp, opacity: dmaStatus === 'connected' ? 0.6 : 1}}
                      />
                    </div>
                    <div>
                      <div style={monoLabel}>Username</div>
                      <input
                        value={dmaConn.user}
                        onChange={e => setDma('user', e.target.value)}
                        placeholder="dma_user"
                        disabled={dmaStatus === 'connected'}
                        style={{...inp, opacity: dmaStatus === 'connected' ? 0.6 : 1}}
                      />
                    </div>
                    <div>
                      <div style={monoLabel}>Password</div>
                      <div style={{position:'relative'}}>
                        <input
                          type={showPass ? 'text' : 'password'}
                          value={dmaConn.password}
                          onChange={e => setDma('password', e.target.value)}
                          placeholder={hasSavedDmaPassword ? 'Saved password' : 'Required'}
                          disabled={dmaStatus === 'connected'}
                          style={{...inp, paddingRight:44, opacity: dmaStatus === 'connected' ? 0.6 : 1}}
                        />
                        <button onClick={() => setShowPass(s => !s)}
                          style={{position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#aaa', fontSize:12, padding:0}}>
                          {showPass ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <div style={monoLabel}>Clients Table</div>
                      <input
                        value={dmaConn.table}
                        onChange={e => setDma('table', e.target.value)}
                        placeholder="clients"
                        disabled={dmaStatus === 'connected'}
                        style={{...inp, opacity: dmaStatus === 'connected' ? 0.6 : 1}}
                      />
                    </div>
                  </div>

                  {/* Error message */}
                  {(dmaStatus === 'error' || dmaError) && dmaError && (
                    <div style={{background:'#fff5f5', border:'1px solid #fcd5d5', borderRadius:6, padding:'10px 12px', fontSize:12, color:'#e74c3c', marginBottom:14}}>
                      {dmaError}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{display:'flex', gap:8, alignItems:'center'}}>
                    {dmaStatus !== 'connected' ? (
                      <button
                        onClick={connectDMA}
                        disabled={dmaStatus === 'connecting' || !dmaReady}
                        style={{background: dmaStatus === 'connecting' || !dmaReady ? '#aaa' : '#1a1a2e', color:'#fff', border:'none', borderRadius:6, padding:'8px 18px', fontSize:13, fontWeight:600, cursor: dmaStatus === 'connecting' || !dmaReady ? 'default' : 'pointer'}}>
                        {dmaStatus === 'connecting' ? 'Connecting…' : 'Test & Connect'}
                      </button>
                    ) : (
                      <button
                        onClick={disconnectDMA}
                        style={{background:'none', border:'1px solid #e2e8f0', borderRadius:6, padding:'7px 14px', fontSize:13, color:'#555', cursor:'pointer'}}>
                        Disconnect
                      </button>
                    )}
                  </div>

                  {/* Field Mapping */}
                  <div style={{borderTop:'1px solid #f0f0f0', margin:'20px 0 16px'}}/>
                  <div style={{fontSize:13, fontWeight:600, color:'#1a1a2e', marginBottom:4}}>Field Mapping</div>
                  <div style={{fontSize:12, color:'#888', marginBottom:16}}>Map DMA column names to helpdesk client fields.</div>

                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16}}>
                    {[
                      { label: 'Account Ref',    key: 'ref' },
                      { label: 'First Name',     key: 'firstName' },
                      { label: 'Last Name',      key: 'lastName' },
                      { label: 'Phone',          key: 'phone' },
                      { label: 'Mobile',         key: 'mobile' },
                      { label: 'Zone / Location',key: 'zone' },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <div style={monoLabel}>{label}</div>
                        <input
                          value={dmaMapping[key] ?? ''}
                          onChange={e => setDmaMapping(m => ({ ...m, [key]: e.target.value }))}
                          placeholder="DMA column name"
                          style={inp}
                        />
                      </div>
                    ))}
                  </div>

                  <div style={{display:'flex', gap:8, alignItems:'center'}}>
                    <button
                      onClick={saveMapping}
                      style={{background:'#1a1a2e', color:'#fff', border:'none', borderRadius:6, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer'}}>
                      Save Mapping
                    </button>
                    {mappingSaved && <span style={{fontSize:13, color:'#27ae60', fontWeight:600}}>✓ Saved</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
