import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, tokens } from '../api/client'
import type { TokenPair } from '../types'

type User = { id: number; username: string; email: string }

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tokens.access) {
      setLoading(false)
      return
    }
    api<User>('/contas/me')
      .then(setUser)
      .catch(() => tokens.clear())
      .finally(() => setLoading(false))
  }, [])

  async function login(username: string, password: string) {
    const data = await api<TokenPair>('/token/pair', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    tokens.set(data.access, data.refresh)
    setUser(await api<User>('/contas/me'))
  }

  function logout() {
    tokens.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
