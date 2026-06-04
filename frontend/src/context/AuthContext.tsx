'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/api'
import { Role } from '@/types'
import {
  getPostLoginPath,
  persistAuthToken,
  clearAuthTokenCookie,
  syncRoleStores,
} from '@/lib/authRedirect'

interface User {
  id: string
  username: string
  email: string
  role: Role
  employee?: {
    employeeRole: {
      name: string
    }
  }
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User
        setToken(storedToken)
        setUser(parsedUser)
        persistAuthToken(storedToken)
        setLoading(false)
        refreshUserInBackground(storedToken, storedUser)
        return
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }

    if (storedToken) {
      setToken(storedToken)
      fetchUser(storedToken)
      return
    }

    setLoading(false)
  }, [])

  const refreshUserInBackground = async (authToken: string, cachedUserJson: string) => {
    try {
      const userData = await authService.getMe(authToken)
      if (userData) {
        setUser(userData as any)
        localStorage.setItem('user', JSON.stringify(userData))
      }
    } catch (error) {
      // getMe failed — keep the cached session, don't log out
      // The token will be validated by the backend on each API call
      console.warn('Background user refresh failed, using cached session:', error)
    }
  }

  const fetchUser = async (authToken: string) => {
    try {
      const userData = await authService.getMe(authToken)
      setUser(userData as any)
      localStorage.setItem('user', JSON.stringify(userData))
    } catch (error) {
      console.error('Failed to fetch user:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response: any = await authService.login(email, password)
      // Backend returns 'accessToken' (camelCase), not 'access_token'
      const { accessToken, user: userData } = response
      
      if (!accessToken) {
        throw new Error('No access token received from server')
      }

      setUser(userData)
      setToken(accessToken)
      localStorage.setItem('token', accessToken)
      localStorage.setItem('user', JSON.stringify(userData))
      persistAuthToken(accessToken, response.expiresIn ?? 900)

      try {
        const { useAuthStore } = await import('@/store/authStore')
        useAuthStore.setState({
          user: userData as any,
          token: accessToken,
          refreshToken: response.refreshToken ?? null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      } catch (_) {}

      await syncRoleStores(accessToken, userData)

      const redirectPath = getPostLoginPath(userData)
      router.replace(redirectPath)
    } catch (error) {
      console.error('AuthContext Login Error:', error)
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    clearAuthTokenCookie()
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
