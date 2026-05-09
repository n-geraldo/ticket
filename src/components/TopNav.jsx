import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import BrandLogo from './BrandLogo'
import NotificationBell from './NotificationBell'

const NAV_ITEMS = ['Tickets', 'Clients', 'Reports', 'Settings']
const NAV_ROUTES = {
  'Tickets':   '/operator',
  'Clients':   '/operator/clients',
  'Reports':   '/operator/reports',
  'Settings':  '/operator/settings',
}

function getActiveItem(pathname) {
  if (pathname.startsWith('/operator/clients'))  return 'Clients'
  if (pathname.startsWith('/operator/reports'))  return 'Reports'
  if (pathname.startsWith('/operator/settings')) return 'Settings'
  return 'Tickets'
}

export default function TopNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const active = getActiveItem(location.pathname)
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'OP'

  return (
    <div style={{ height: 48, background: '#1a1a2e', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 24, flexShrink: 0 }}>
      <BrandLogo size={34} compact />
      <div style={{ flex: 1 }} />
      {NAV_ITEMS.map(n => (
        <button key={n} onClick={() => navigate(NAV_ROUTES[n])} style={{
          background: 'none', border: 'none', fontSize: 13, cursor: 'pointer',
          color: n === active ? '#fff' : 'rgba(255,255,255,0.45)',
          fontWeight: n === active ? 600 : 400,
          borderBottom: n === active ? '2px solid #fff' : '2px solid transparent',
          paddingBottom: 2,
        }}>{n}</button>
      ))}
      <div style={{ flex: 1 }} />
      <button onClick={() => navigate('/mobile')} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 5, color: 'rgba(255,255,255,0.65)', fontSize: 12, cursor: 'pointer', padding: '4px 10px' }}>
        📱 Mobile View
      </button>
      <NotificationBell />
      <button onClick={() => { logout(); navigate('/login') }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', padding: '4px 10px', marginLeft: 4 }}>
        Sign out
      </button>
      <div title={user?.name} style={{ width: 32, height: 32, borderRadius: 16, background: '#4a9eff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700, flexShrink: 0, marginLeft: 4 }}>{initials}</div>
    </div>
  )
}
