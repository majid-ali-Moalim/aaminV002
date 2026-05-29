'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { isDispatcherUser, isDispatcherActive } from '@/lib/hooks/useDispatcherAccess'

interface DispatcherGuardProps {
  children: ReactNode
}

export function DispatcherGuard({ children }: DispatcherGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, token, loading } = useAuth()
  const isAuthenticated = !!token && !!user
  const isLoginPage = pathname === '/dispatcher/login'

  useEffect(() => {
    if (loading || isLoginPage) return

    if (!isAuthenticated || !user) {
      router.replace('/dispatcher/login')
      return
    }

    if (!isDispatcherUser(user)) {
      const role = user.role as string
      if (role === 'ADMIN') router.replace('/admin/dashboard')
      else if (role === 'EMPLOYEE') {
        const roleName = (
          user.employee?.employeeRole?.name ?? (user as any).employeeRole ?? ''
        ).toUpperCase()
        if (roleName.includes('DRIVER')) router.replace('/driver')
        else if (roleName.includes('NURSE')) router.replace('/nurse/dashboard')
        else router.replace('/login')
      } else {
        router.replace('/login')
      }
      return
    }

    if (!isDispatcherActive(user)) {
      router.replace('/dispatcher/login?error=inactive')
    }
  }, [user, isAuthenticated, router, loading, isLoginPage])

  if (isLoginPage) return <>{children}</>

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    )
  }

  if (isDispatcherUser(user) && isDispatcherActive(user)) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
    </div>
  )
}
