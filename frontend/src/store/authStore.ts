'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type UserRole = 'ADMIN' | 'DISPATCHER' | 'DRIVER' | 'NURSE' | 'MANAGER' | 'HOSPITAL' | 'PATIENT'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  lastLogin?: string
  profile?: {
    phone?: string
    avatar?: string
    department?: string
    licenseNumber?: string
    employeeId?: string
  }
}

export interface AuthState {
  // State
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshAccessToken: () => Promise<void>
  clearError: () => void
  setLoading: (loading: boolean) => void
  updateUser: (user: Partial<User>) => void
}

// Role-based redirect paths
export const ROLE_REDIRECTS: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  DISPATCHER: '/dispatcher/dashboard',
  DRIVER: '/driver/dashboard',
  NURSE: '/nurse/dashboard',
  MANAGER: '/manager/dashboard',
  HOSPITAL: '/hospital/dashboard',
  PATIENT: '/patient/dashboard'
}

// Role-based permissions
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: [
    'manage_users', 'manage_ambulances', 'manage_emergencies', 'view_analytics',
    'manage_system', 'manage_hospitals', 'manage_regions', 'full_access'
  ],
  DISPATCHER: [
    'dispatch_ambulances', 'view_emergencies', 'assign_resources', 'update_status',
    'view_maps', 'communicate_staff'
  ],
  DRIVER: [
    'view_assignments', 'update_location', 'update_status', 'view_patient_info',
    'communicate_dispatch'
  ],
  NURSE: [
    'view_patients', 'update_treatment', 'view_medical_history', 'update_vitals',
    'communicate_dispatch'
  ],
  MANAGER: [
    'view_reports', 'manage_staff', 'view_analytics', 'approve_requests',
    'manage_operations'
  ],
  HOSPITAL: [
    'view_patients', 'update_patient_status', 'view_emergencies', 'communicate_dispatch',
    'manage_beds'
  ],
  PATIENT: [
    'request_ambulance', 'track_request', 'view_own_info', 'update_profile'
  ]
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login action
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          })

          if (!response.ok) {
            let errorData
            try {
              errorData = await response.json()
            } catch (e) {
              throw new Error('Login failed: Server returned an invalid response')
            }
            throw new Error(errorData.message || 'Login failed')
          }

          const data = await response.json()
          
          set({
            user: data.user,
            token: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })

          // Store token in localStorage for API calls
          if (typeof window !== 'undefined') {
            localStorage.setItem('token', data.accessToken)
            localStorage.setItem('refreshToken', data.refreshToken)
          }

        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null,
          })
          throw error
        }
      },

      // Logout action
      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          isLoading: false,
        })

        // Clear tokens from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
        }
      },

      // Refresh token action
      refreshAccessToken: async () => {
        const { refreshToken: currentRefreshToken } = get()
        
        if (!currentRefreshToken) {
          get().logout()
          return
        }

        try {
          const response = await fetch('http://localhost:3001/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken: currentRefreshToken }),
          })

          if (!response.ok) {
            throw new Error('Token refresh failed')
          }

          const data = await response.json()
          
          set({
            token: data.accessToken,
            refreshToken: data.refreshToken || currentRefreshToken,
          })

          // Update localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('token', data.accessToken)
            if (data.refreshToken) {
              localStorage.setItem('refreshToken', data.refreshToken)
            }
          }

        } catch (error) {
          // Refresh failed, logout user
          get().logout()
          throw error
        }
      },

      // Clear error action
      clearError: () => set({ error: null }),

      // Set loading action
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      // Update user action
      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData }
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Helper functions
export const hasPermission = (userRole: UserRole, permission: string): boolean => {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false
}

export const canAccessRoute = (userRole: UserRole, route: string): boolean => {
  const roleRoutes: Record<UserRole, string[]> = {
    ADMIN: ['/admin', '/admin/'],
    DISPATCHER: ['/dispatcher', '/dispatcher/'],
    DRIVER: ['/driver', '/driver/'],
    NURSE: ['/nurse', '/nurse/'],
    MANAGER: ['/manager', '/manager/'],
    HOSPITAL: ['/hospital', '/hospital/'],
    PATIENT: ['/patient', '/patient/']
  }

  const allowedRoutes = roleRoutes[userRole] || []
  return allowedRoutes.some(allowedRoute => route.startsWith(allowedRoute))
}

export const getRoleRedirectPath = (role: UserRole): string => {
  return ROLE_REDIRECTS[role] || '/login'
}
