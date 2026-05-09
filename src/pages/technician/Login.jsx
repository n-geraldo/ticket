import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function TechLogin() {
  const navigate = useNavigate()
  const { login, logout } = useAuth()
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
    if (result.user.role !== 'technician') {
      logout()
      setError('Operator account — use the operator login.')
      return
    }
    navigate('/mobile')
  }

  const labelStyle = {
    fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, display: 'block',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Brand header */}
        <div style={{ background: '#1a1a2e', padding: '32px 24px 56px', textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 26, color: '#fff', letterSpacing: 1, marginBottom: 4 }}>ISP DESK</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Technical Management
          </div>
        </div>

        {/* Form card */}
        <div style={{ flex: 1, background: '#f5f5f5', borderRadius: '20px 20px 0 0', marginTop: -16, padding: '28px 20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>Welcome back</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 24 }}>Sign in to your account</div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {/* Username */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Username</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="karim.amine"
                autoComplete="username"
                style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '12px', fontSize: 14, color: '#1a1a2e', background: '#fff', outline: 'none', fontFamily: 'inherit' }}
                onFocus={e => { e.target.style.border = '1.5px solid #1a6eb5'; e.target.style.boxShadow = '0 0 0 3px rgba(26,110,181,0.1)' }}
                onBlur={e => { e.target.style.border = '1.5px solid #e2e8f0'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ width: '100%', border: '1.5px solid #1a6eb5', borderRadius: 8, padding: '12px', paddingRight: 40, fontSize: 14, color: '#1a1a2e', background: '#fff', outline: 'none', fontFamily: 'inherit', boxShadow: '0 0 0 3px rgba(26,110,181,0.1)' }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.35, fontSize: 14, padding: 0 }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
              <button type="button" style={{ background: 'none', border: 'none', fontSize: 12, color: '#1a6eb5', cursor: 'pointer', padding: 0 }}>
                Forgot password?
              </button>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ background: loading ? '#555' : '#1a1a2e', borderRadius: 10, padding: '14px', textAlign: 'center', cursor: loading ? 'default' : 'pointer', border: 'none', width: '100%', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>
                {loading ? 'Signing in…' : 'Sign In'}
              </span>
            </button>

            <div style={{ textAlign: 'center', fontSize: 12, color: '#bbb', marginTop: 'auto', paddingTop: 16 }}>
              Having trouble? Contact your{' '}
              <span style={{ color: '#1a6eb5', cursor: 'pointer' }}>administrator</span>
            </div>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button type="button" onClick={() => navigate('/login')}
                style={{ background: 'none', border: 'none', fontSize: 12, color: '#aaa', cursor: 'pointer' }}>
                🖥 Operator login
              </button>
            </div>
          </form>
        </div>
    </div>
  )
}
