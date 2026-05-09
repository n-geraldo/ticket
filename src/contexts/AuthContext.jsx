import { createContext, useContext, useState } from 'react'
import { apiLogin } from '../data/api'

const AuthContext = createContext(null)

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('ispdesk_token')
    return token ? decodeToken(token) : null
  })

  const login = async (username, password) => {
    try {
      const { token, user: u } = await apiLogin(username, password)
      localStorage.setItem('ispdesk_token', token)
      setUser(u)
      return { ok: true, user: u }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }

  const logout = () => {
    localStorage.removeItem('ispdesk_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
