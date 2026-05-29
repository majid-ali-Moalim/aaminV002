'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Role } from '@/types'

interface DriverGuardProps {
  children: ReactNode
}

export function DriverGuard({ children }: DriverGuardProps) {
  const router = useRouter()
  const { user, token, loading } = useAuth()
  const isAuthenticated = !!token && !!user

  useEffect(() => {
    if (loading) return;
    const checkAuth = async () => {
      // If not authenticated, redirect to login
      if (!isAuthenticated || !user) {
        router.push('/login')
        return
      }

      // If not driver role, redirect to appropriate dashboard
      if (user.role !== 'DRIVER' && user.role !== 'ADMIN') { // Allowing Admin to test
        const roleRedirects: Record<string, string> = {
          ADMIN: '/admin/dashboard',
          DISPATCHER: '/dispatcher/dashboard',
          DRIVER: '/driver/dashboard',
          NURSE: '/nurse/dashboard',
          MANAGER: '/manager/dashboard',
          HOSPITAL: '/hospital/dashboard',
          PATIENT: '/patient/dashboard'
        }
        
        const redirectPath = roleRedirects[user.role as string]
        if (redirectPath) {
          router.push(redirectPath)
        } else {
          router.push('/')
        }
        return
      }

      // Check if user is active
      if ((user as any).isActive === false) {
        router.push('/login?error=account_inactive')
        return
      }
    }

    checkAuth()
  }, [user, isAuthenticated, router, loading])

  // Show loading state while checking auth
  if (loading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  // Only render children if user is driver
  if ((user.role === 'DRIVER' || user.role === 'ADMIN') && (user as any).isActive !== false) {
    return <>{children}</>
  }

  // Fallback loading state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
    </div>
  )
}
