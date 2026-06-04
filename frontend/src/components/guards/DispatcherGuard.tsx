'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getPostLoginPath, isDispatcherUser, isDispatcherActive } from '@/lib/authRedirect'

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
      router.replace(getPostLoginPath(user))
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
