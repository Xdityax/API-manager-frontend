import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getMe, loginUser, registerUser } from '../api/auth'

const AUTH_STORAGE_KEY = 'meterflow_auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [isHydrating, setIsHydrating] = useState(true)

  useEffect(() => {
    const hydrate = async () => {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (!stored) {
        setIsHydrating(false)
        return
      }

      try {
        const parsed = JSON.parse(stored)
        if (!parsed?.token) {
          localStorage.removeItem(AUTH_STORAGE_KEY)
          setIsHydrating(false)
          return
        }

        const meResponse = await getMe(parsed.token)
        setToken(parsed.token)
        setUser(meResponse.user)
      } catch (error) {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      } finally {
        setIsHydrating(false)
      }
    }

    hydrate()
  }, [])

  const persistAuth = (nextToken, nextUser) => {
    setToken(nextToken)
    setUser(nextUser)
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        token: nextToken,
        user: nextUser,
      }),
    )
  }

  const signIn = async ({ email, password }) => {
    const response = await loginUser({ email, password })
    persistAuth(response.token, response.user)
    return response
  }

  const signUp = async ({ name, email, password }) => {
    return registerUser({ name, email, password })
  }

  const signOut = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      isHydrating,
      signIn,
      signUp,
      signOut,
    }),
    [token, user, isHydrating],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
