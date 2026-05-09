import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBrandName } from '../branding'
import BrandLogo from '../components/BrandLogo'
import { useAuth } from '../contexts/AuthContext'

const isMobile = () =>
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768

function redirectForUser(user) {
  if (user.role === 'technician') return '/mobile'
  return isMobile() ? '/m' : '/operator'
}

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [brandName] = useState(getBrandName)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.')
      return
    }
    setLoading(true)
    const result = await login(username, password)
    setLoading(false)
    if (!result.ok) { setError('Invalid credentials.'); return }
    navigate(redirectForUser(result.user))
  }

  const mobile = isMobile()

  if (mobile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Brand */}
        <div style={{ background: '#1a1a2e', padding: '40px 24px 56px', textAlign: 'center' }}>
          <BrandLogo size={68} subtitle="Technical Management System" />
        </div>

        {/* Form card */}
        <div style={{ flex: 1, background: '#f5f5f5', borderRadius: '20px 20px 0 0', marginTop: -16, padding: '28px 20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>Welcome back</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>Sign in to your account</div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'block' }}>
                Username
              </label>
              <input value={username} onChange={e => setUsername(e.target.value)}
                placeholder="your.username" autoComplete="username"
                style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '13px', fontSize: 15, color: '#1a1a2e', background: '#fff', outline: 'none', fontFamily: 'inherit' }}
                onFocus={e => { e.target.style.border = '1.5px solid #1a6eb5'; e.target.style.boxShadow = '0 0 0 3px rgba(26,110,181,0.1)' }}
                onBlur={e => { e.target.style.border = '1.5px solid #e2e8f0'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div>
              <label style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'block' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '13px', paddingRight: 44, fontSize: 15, color: '#1a1a2e', background: '#fff', outline: 'none', fontFamily: 'inherit' }}
                  onFocus={e => { e.target.style.border = '1.5px solid #1a6eb5'; e.target.style.boxShadow = '0 0 0 3px rgba(26,110,181,0.1)' }}
                  onBlur={e => { e.target.style.border = '1.5px solid #e2e8f0'; e.target.style.boxShadow = 'none' }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, fontSize: 16, padding: 0 }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ background: loading ? '#555' : '#1a1a2e', borderRadius: 10, padding: '15px', fontSize: 15, fontWeight: 700, color: '#fff', border: 'none', cursor: loading ? 'default' : 'pointer', marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  /* ── Desktop layout ── */
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden', background: '#1a1a2e' }}>
      {/* Left branding */}
      <div style={{ width: 420, background: '#1a1a2e', display: 'flex', flexDirection: 'column', padding: 48, justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <BrandLogo size={60} subtitle="Technical Management System" compact />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {[
            { icon: '🎫', title: 'Unified Ticket System',  desc: 'Manage problems and installations in one place' },
            { icon: '📱', title: 'Mobile for Technicians', desc: 'Field agents get tickets on their phone' },
            { icon: '📊', title: 'Real-time Reporting',    desc: 'Track SLA, performance and resolution rates' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#fff', marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>© 2026 {brandName}</div>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 320 }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>Sign in</div>
            <div style={{ fontSize: 13, color: '#888' }}>Enter your credentials to continue</div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'block' }}>Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)}
                placeholder="your.username" autoComplete="username"
                style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 7, padding: '11px 12px', fontSize: 14, color: '#1a1a2e', background: '#fff', outline: 'none', fontFamily: 'inherit' }}
                onFocus={e => { e.target.style.border = '1.5px solid #1a6eb5'; e.target.style.boxShadow = '0 0 0 3px rgba(26,110,181,0.1)' }}
                onBlur={e => { e.target.style.border = '1.5px solid #e2e8f0'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div>
              <label style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'block' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 7, padding: '11px 12px', paddingRight: 40, fontSize: 14, color: '#1a1a2e', background: '#fff', outline: 'none', fontFamily: 'inherit' }}
                  onFocus={e => { e.target.style.border = '1.5px solid #1a6eb5'; e.target.style.boxShadow = '0 0 0 3px rgba(26,110,181,0.1)' }}
                  onBlur={e => { e.target.style.border = '1.5px solid #e2e8f0'; e.target.style.boxShadow = 'none' }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.35, fontSize: 14, padding: 0 }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: '#dc2626' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ background: loading ? '#555' : '#1a1a2e', borderRadius: 8, padding: '13px', fontSize: 14, fontWeight: 700, color: '#fff', border: 'none', cursor: loading ? 'default' : 'pointer', marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
