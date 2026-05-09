import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const PINS = [
  {x:55,  y:110, prio:'high', label:'#1041', type:'problem', client:'Farouk Telecom', id:1041},
  {x:130, y:60,  prio:'high', label:'#1040', type:'install', client:'Ahmed Res.',     id:1040},
  {x:220, y:145, prio:'med',  label:'#1039', type:'problem', client:'City Hotel',     id:1039},
  {x:90,  y:200, prio:'med',  label:'#1038', type:'install', client:'Nour Shop',      id:1038},
  {x:270, y:80,  prio:'low',  label:'#1036', type:'problem', client:'Lycée Ibn R.',   id:1036},
]

const PRIO_COLS = {high:'#e74c3c', med:'#e67e22', low:'#27ae60'}

const BOTTOM_NAV = [
  {icon:'☰',  label:'Tickets',  path:'/mobile'},
  {icon:'🗺', label:'Map',      path:'/mobile/map',      active:true},
  {icon:'📅', label:'Schedule', path:'/mobile/schedule'},
  {icon:'⚙', label:'Settings'},
]

export default function MapView() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div style={{minHeight:'100vh',background:'#f5f5f5',display:'flex',flexDirection:'column'}}>
        {/* Map */}
        <div style={{flex:1,position:'relative',background:'#e8e8e8',overflow:'hidden',minHeight:580}}>
          <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0.15}}>
            <defs>
              <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#555" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#map-grid)"/>
            <line x1="0" y1="160" x2="390" y2="160" stroke="#fff" strokeWidth="8"/>
            <line x1="0" y1="300" x2="390" y2="300" stroke="#fff" strokeWidth="8"/>
            <line x1="130" y1="0" x2="130" y2="600" stroke="#fff" strokeWidth="8"/>
            <line x1="270" y1="0" x2="270" y2="600" stroke="#fff" strokeWidth="6"/>
            <rect x="10"  y="40"  width="110" height="110" fill="#ddd" opacity="0.6" rx="3"/>
            <rect x="140" y="40"  width="120" height="110" fill="#ddd" opacity="0.6" rx="3"/>
            <rect x="280" y="40"  width="100" height="110" fill="#ddd" opacity="0.6" rx="3"/>
            <rect x="10"  y="170" width="110" height="120" fill="#ddd" opacity="0.6" rx="3"/>
            <rect x="140" y="170" width="120" height="120" fill="#ddd" opacity="0.6" rx="3"/>
            <rect x="280" y="170" width="100" height="120" fill="#ddd" opacity="0.6" rx="3"/>
          </svg>

          {/* Technician position */}
          <div style={{position:'absolute',left:190,top:185,width:16,height:16,borderRadius:8,background:'#1a6eb5',border:'3px solid #fff',boxShadow:'0 2px 8px rgba(0,0,0,0.3)',zIndex:5}}/>

          {/* Ticket pins */}
          {PINS.map((p, i) => (
            <div key={i} style={{position:'absolute',left:p.x,top:p.y,zIndex:4,cursor:'pointer'}}
              onClick={() => navigate(`/mobile/ticket/${p.id}`)}>
              <div style={{width:28,height:28,borderRadius:14,background:PRIO_COLS[p.prio],border:'2px solid #fff',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 6px rgba(0,0,0,0.2)'}}>
                <span style={{fontSize:10,color:'#fff'}}>⚑</span>
              </div>
              <div style={{fontSize:9,fontFamily:'IBM Plex Mono, monospace',color:'#333',background:'rgba(255,255,255,0.9)',padding:'1px 4px',borderRadius:3,marginTop:2,whiteSpace:'nowrap'}}>{p.label}</div>
            </div>
          ))}

          {/* Search overlay */}
          <div style={{position:'absolute',top:12,left:12,right:12,background:'#fff',borderRadius:8,padding:'8px 12px',boxShadow:'0 2px 12px rgba(0,0,0,0.15)',display:'flex',alignItems:'center',gap:8,zIndex:10}}>
            <span style={{fontSize:14,opacity:0.4}}>🔍</span>
            <span style={{fontSize:13,color:'#aaa'}}>Search address or ticket...</span>
          </div>

          {/* Bottom sheet */}
          <div style={{position:'absolute',bottom:0,left:0,right:0,background:'#fff',borderRadius:'16px 16px 0 0',padding:'12px 16px',boxShadow:'0 -4px 20px rgba(0,0,0,0.12)',zIndex:10}}>
            <div style={{width:36,height:4,borderRadius:2,background:'#ddd',margin:'0 auto 12px'}}/>
            <div style={{fontSize:12,fontWeight:600,color:'#1a1a2e',marginBottom:8}}>{PINS.length} tickets nearby</div>
            <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4}}>
              {PINS.map((p, i) => (
                <div key={i} style={{flexShrink:0,border:'1.5px solid #eee',borderRadius:8,padding:'8px 10px',minWidth:110,cursor:'pointer'}}
                  onClick={() => navigate(`/mobile/ticket/${p.id}`)}>
                  <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:4}}>
                    <div style={{width:6,height:6,borderRadius:3,background:PRIO_COLS[p.prio]}}/>
                    <span style={{fontFamily:'IBM Plex Mono, monospace',fontSize:10,color:'#888'}}>{p.label}</span>
                  </div>
                  <div style={{fontSize:11,fontWeight:600,color:'#1a1a2e'}}>{p.type==='problem'?'Problem':'Install'}</div>
                  <div style={{fontSize:10,color:'#888',marginTop:2}}>{p.client}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{height:60,background:'#fff',borderTop:'1px solid #f0f0f0',display:'flex',alignItems:'center',justifyContent:'space-around',flexShrink:0}}>
          {BOTTOM_NAV.map(n => (
            <button key={n.label} onClick={() => n.path && navigate(n.path)}
              style={{background:'none',border:'none',cursor:'pointer',textAlign:'center',padding:'4px 12px'}}>
              <div style={{fontSize:20}}>{n.icon}</div>
              <div style={{fontSize:10,color:n.active?'#1a6eb5':'#aaa',fontWeight:n.active?700:400}}>{n.label}</div>
            </button>
          ))}
        </div>

        {(user?.role === 'admin' || user?.role === 'operator') && (
          <button onClick={() => navigate('/operator')} style={{background:'rgba(26,26,46,0.06)',border:'none',padding:'8px',fontSize:11,color:'#999',cursor:'pointer',textAlign:'center',flexShrink:0}}>
            🖥 Switch to Operator View
          </button>
        )}
    </div>
  )
}
