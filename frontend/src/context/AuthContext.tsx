'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/api'
import { Role } from '@/types'

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
      // Restore session immediately from cache — no API call needed
      try {
        const parsedUser = JSON.parse(storedUser)
        setToken(storedToken)
        setUser(parsedUser)
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
      setLoading(false)

      // Optionally refresh user profile in the background (non-blocking)
      refreshUserInBackground(storedToken, storedUser)
    } else if (storedToken) {
      // Token exists but no cached user — fetch from backend
      setToken(storedToken)
      fetchUser(storedToken)
    } else {
      setLoading(false)
    }
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
      // Persist user so page refresh doesn't require a getMe round-trip
      localStorage.setItem('user', JSON.stringify(userData))

      // Keep Zustand auth store in sync for legacy guards
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

      // Redirect based on the role field returned directly by the unified auth endpoint
      const role = userData.role as string

      if (role === 'ADMIN') {
        router.push('/admin/dashboard')
      } else if (role === 'DISPATCHER') {
        router.push('/dispatcher/dashboard')
      } else if (role === 'DRIVER') {
        // Sync the driver-specific Zustand store so the driver portal
        // auth guard (which reads driverStore.isAuthenticated) passes.
        try {
          const { useDriverStore } = await import('@/lib/stores/driverStore')
          useDriverStore.getState().setAuth(accessToken, userData.id)
        } catch (e) {
          console.warn('Could not sync driverStore:', e)
        }
        router.push('/driver')
      } else if (role === 'NURSE') {
        router.push('/nurse/dashboard')
      } else if (role === 'MANAGER') {
        router.push('/manager/dashboard')
      } else if (role === 'HOSPITAL') {
        router.push('/hospital/dashboard')
      } else if (role === 'PATIENT') {
        router.push('/patient/dashboard')
      } else if (role === 'EMPLOYEE') {
        // Legacy fallback: resolve by employeeRole relation
        const roleName = (
          userData.employee?.employeeRole?.name ??
          userData.employee?.employeeType ??
          ''
        ).toUpperCase()
        if (roleName === 'DISPATCHER') router.push('/dispatcher/dashboard')
        else if (roleName === 'DRIVER') router.push('/driver')
        else if (roleName === 'NURSE') router.push('/nurse/dashboard')
        else router.push('/admin/dashboard')
      } else {
        router.push('/')
      }
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
