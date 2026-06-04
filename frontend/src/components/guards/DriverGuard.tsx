'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  getPostLoginPath,
  isAdminUser,
  isDriverUser,
} from '@/lib/authRedirect'

interface DriverGuardProps {
  children: ReactNode
}

export function DriverGuard({ children }: DriverGuardProps) {
  const router = useRouter()
  const { user, token, loading } = useAuth()
  const isAuthenticated = !!token && !!user

  useEffect(() => {
    if (loading) return

    if (!isAuthenticated || !user) {
      router.replace('/driver/login')
      return
    }

    if (!isDriverUser(user) && !isAdminUser(user)) {
      router.replace(getPostLoginPath(user))
      return
    }

    if ((user as { isActive?: boolean }).isActive === false) {
      router.replace('/login?error=account_inactive')
    }
  }, [user, isAuthenticated, router, loading])

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    )
  }

  if ((isDriverUser(user) || isAdminUser(user)) && (user as { isActive?: boolean }).isActive !== false) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
    </div>
  )
}
