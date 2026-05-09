import { useNavigate } from 'react-router-dom'

const ITEMS = [
  { icon: '☰',  label: 'Tickets',  path: '/m',           key: 'tickets'  },
  { icon: '＋', label: 'New',      path: '/m/new',        key: 'new'      },
  { icon: '👥', label: 'Clients',  path: '/m/clients',    key: 'clients'  },
  { icon: '⚙', label: 'Settings', path: '/m/settings',   key: 'settings' },
]

export default function BottomNav({ active }) {
  const navigate = useNavigate()
  return (
    <div style={{ height: 60, background: '#fff', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexShrink: 0 }}>
      {ITEMS.map(n => {
        const isActive = n.key === active
        return (
          <button key={n.key} onClick={() => navigate(n.path)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '4px 12px', flex: 1 }}>
            <div style={{ fontSize: 18 }}>{n.icon}</div>
            <div style={{ fontSize: 10, color: isActive ? '#1a6eb5' : '#aaa', fontWeight: isActive ? 700 : 400 }}>{n.label}</div>
          </button>
        )
      })}
    </div>
  )
}
