'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, UserRole } from '@/store/authStore'

interface ManagerGuardProps {
  children: ReactNode
}

export function ManagerGuard({ children }: ManagerGuardProps) {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    const checkAuth = async () => {
      // If not authenticated, redirect to login
      if (!isAuthenticated || !user) {
        router.push('/login')
        return
      }

      // If not manager role, redirect to appropriate dashboard
      if (user.role !== 'MANAGER') {
        const roleRedirects: Record<UserRole, string> = {
          ADMIN: '/admin/dashboard',
          DISPATCHER: '/dispatcher/dashboard',
          DRIVER: '/driver/dashboard',
          NURSE: '/nurse/dashboard',
          MANAGER: '/manager/dashboard',
          HOSPITAL: '/hospital/dashboard',
          PATIENT: '/patient/dashboard'
        }
        
        const redirectPath = roleRedirects[user.role]
        if (redirectPath) {
          router.push(redirectPath)
        }
        return
      }

      // Check if user is active
      if (!user.isActive) {
        router.push('/login?error=account_inactive')
        return
      }
    }

    checkAuth()
  }, [user, isAuthenticated, router])

  // Show loading state while checking auth
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  // Only render children if user is manager
  if (user.role === 'MANAGER' && user.isActive) {
    return <>{children}</>
  }

  // Fallback loading state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
    </div>
  )
}
