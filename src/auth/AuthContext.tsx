import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'

const NAME_KEY = 'align:displayName'

type AuthState = {
  user: User | null
  authReady: boolean
  name: string
  setName: (v: string) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [name, setNameState] = useState(() => localStorage.getItem(NAME_KEY) ?? '')

  const setName = (v: string) => {
    setNameState(v)
    localStorage.setItem(NAME_KEY, v)
  }

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next)
      setAuthReady(true)
      if (next) {
        setNameState((prev) => prev || next.displayName || localStorage.getItem(NAME_KEY) || '')
      }
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, authReady, name, setName }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
