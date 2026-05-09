import { useState, useEffect } from 'react'
import { getReports, getZones, exportReportsCsv } from '../../data/api'
import TopNav from '../../components/TopNav'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const CATEGORY_COLORS = ['#e74c3c', '#e67e22', '#6b3ca8', '#1a6eb5', '#2a7a3b', '#555']

function formatAvgHours(h) {
  const hrs = Math.floor(h)
  const min = Math.round((h - hrs) * 60)
  return hrs > 0 ? `${hrs}h ${min}m` : `${min}m`
}

export default function Reports() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [zones, setZones] = useState([])
  const [zoneFilter, setZoneFilter] = useState('All Zones')

  useEffect(() => {
    Promise.all([getReports(), getZones()])
      .then(([reports, z]) => { setData(reports); setZones(z) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleExport = () => {
    const a = document.createElement('a')
    a.href = exportReportsCsv()
    a.download = 'tickets.csv'
    a.click()
  }

  const kpis = data ? [
    {label:'Total Tickets',       val: data.total,          sub:'All time',                              col:'#1a6eb5'},
    {label:'Resolved',            val: data.closed,          sub:`${data.total ? ((data.closed/data.total)*100).toFixed(1) : 0}% resolution rate`, col:'#2a7a3b'},
    {label:'Avg. Resolution',     val: data.avgResolution,   sub:'Closed tickets',                       col:'#b56a00'},
    {label:'Client Satisfaction', val:'4.6 / 5',            sub:'Based on 134 ratings',                  col:'#6b3ca8'},
  ] : []

  const monthBars = (() => {
    if (!data?.monthly?.length) return MONTHS.map((m, i) => ({ label: m[0], val: 0, isCurrent: i === new Date().getMonth() }))
    const map = Object.fromEntries(data.monthly.map(m => [m.month, m.count]))
    return MONTHS.map((m, i) => ({ label: m[0], val: map[m] || 0, isCurrent: i === new Date().getMonth() }))
  })()
  const maxBar = Math.max(...monthBars.map(b => b.val), 1)
  const categories = (data?.categories?.length ? data.categories : [{ label: 'No category', count: 0 }])
    .map((c, i) => ({ ...c, col: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
  const totalCat = Math.max(categories.reduce((a, c) => a + c.count, 0), 1)

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'#f8fafc'}}>
      <TopNav />

      <div style={{flex:1,overflow:'auto',padding:24,display:'flex',flexDirection:'column',gap:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:'#1a1a2e'}}>Reports & Analytics</div>
            <div style={{fontSize:12,color:'#888',marginTop:2}}>All time · All Technicians · All Zones</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <select value={zoneFilter} onChange={e => setZoneFilter(e.target.value)} style={{border:'1px solid #e2e8f0',borderRadius:6,padding:'6px 10px',fontSize:13,color:'#555',background:'#fff',cursor:'pointer',outline:'none'}}>
              <option>All Zones</option>
              {zones.map(z => <option key={z.id}>{z.name}</option>)}
            </select>
            <button onClick={handleExport} style={{background:'#1a1a2e',color:'#fff',border:'none',borderRadius:6,padding:'6px 14px',fontSize:13,fontWeight:600,cursor:'pointer'}}>Export CSV</button>
          </div>
        </div>

        {loading && <div style={{padding:48,textAlign:'center',color:'#aaa',fontSize:14}}>Loading…</div>}

        {!loading && data && <>
          {/* KPI cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            {kpis.map(k => (
              <div key={k.label} style={{background:'#fff',border:'1px solid #e8e8e8',borderRadius:8,padding:16}}>
                <div style={{fontFamily:'IBM Plex Mono, monospace',fontSize:9,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>{k.label}</div>
                <div style={{fontSize:28,fontWeight:700,color:k.col,marginBottom:4,lineHeight:1}}>{k.val}</div>
                <div style={{fontSize:11,color:'#888'}}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {/* Bar chart */}
            <div style={{background:'#fff',border:'1px solid #e8e8e8',borderRadius:8,padding:16}}>
              <div style={{fontFamily:'IBM Plex Mono, monospace',fontSize:9,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:16}}>Tickets per Month</div>
              <div style={{display:'flex',alignItems:'flex-end',gap:4,height:120}}>
                {monthBars.map((b, i) => (
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                    <div style={{width:'100%',background:b.isCurrent?'#1a6eb5':'#d0ddf0',borderRadius:'2px 2px 0 0',height:`${Math.max(2,(b.val/maxBar)*110)}px`}}/>
                    <div style={{fontFamily:'IBM Plex Mono, monospace',fontSize:9,color:'#bbb'}}>{b.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Donut chart */}
            <div style={{background:'#fff',border:'1px solid #e8e8e8',borderRadius:8,padding:16,display:'flex',gap:20,alignItems:'center'}}>
              <div style={{flexShrink:0}}>
                <div style={{fontFamily:'IBM Plex Mono, monospace',fontSize:9,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>By Category</div>
                <svg width={110} height={110} viewBox="0 0 110 110">
                  {(() => {
                    let offset = 0
                    const r = 40, cx = 55, cy = 55, stroke = 18
                    const circ = 2 * Math.PI * r
                    return categories.map((c, i) => {
                      const pct = c.count / totalCat
                      const dash = pct * circ
                      const gap = circ - dash
                      const rot = offset * 360 - 90
                      offset += pct
                      return (
                        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={c.col} strokeWidth={stroke}
                          strokeDasharray={`${dash} ${gap}`}
                          transform={`rotate(${rot} ${cx} ${cy})`} strokeLinecap="butt"/>
                      )
                    })
                  })()}
                  <text x="55" y="51" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1a1a2e">{data.total}</text>
                  <text x="55" y="64" textAnchor="middle" fontSize="9" fill="#aaa">tickets</text>
                </svg>
              </div>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:10}}>
                {categories.map(c => (
                  <div key={c.label} style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:10,height:10,borderRadius:2,background:c.col,flexShrink:0}}/>
                    <div style={{fontSize:12,flex:1,color:'#333'}}>{c.label}</div>
                    <div style={{fontFamily:'IBM Plex Mono, monospace',fontSize:11,color:'#888'}}>{c.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Technician performance */}
          <div style={{background:'#fff',border:'1px solid #e8e8e8',borderRadius:8,overflow:'hidden'}}>
            <div style={{padding:'12px 16px',background:'#fafafa',borderBottom:'1px solid #eee'}}>
              <span style={{fontWeight:600,fontSize:14,color:'#1a1a2e'}}>Technician Performance</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 100px 120px',padding:'6px 16px',background:'#fafafa',borderBottom:'1px solid #eee'}}>
              {['Technician','Closed','Avg. Resolution'].map(h => (
                <div key={h} style={{fontFamily:'IBM Plex Mono, monospace',fontSize:9,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em'}}>{h}</div>
              ))}
            </div>
            {data.technicians.map((t, i) => (
              <div key={t.id} style={{display:'grid',gridTemplateColumns:'1fr 100px 120px',padding:'12px 16px',borderBottom:'1px solid #f5f5f5',alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:28,height:28,borderRadius:14,background:'#d0ddf0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#1a6eb5'}}>
                    {t.initials}
                  </div>
                  <span style={{fontSize:13,fontWeight:500,color:'#1a1a2e'}}>{t.name}</span>
                </div>
                <div style={{fontFamily:'IBM Plex Mono, monospace',fontSize:12,color:'#555'}}>{t.closed}</div>
                <div style={{fontFamily:'IBM Plex Mono, monospace',fontSize:12,color:'#555'}}>
                  {t.avgHours > 0 ? formatAvgHours(t.avgHours) : '—'}
                </div>
              </div>
            ))}
          </div>
        </>}
      </div>
    </div>
  )
}
