'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  getPostLoginPath,
  isNurseUser,
  isAdminUser,
} from '@/lib/authRedirect'

interface NurseGuardProps {
  children: ReactNode
}

export function NurseGuard({ children }: NurseGuardProps) {
  const router = useRouter()
  const { user, token, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    if (!token || !user) {
      router.replace('/login')
      return
    }

    if (!isNurseUser(user) && !isAdminUser(user)) {
      router.replace(getPostLoginPath(user))
      return
    }

    if ((user as { isActive?: boolean }).isActive === false) {
      router.replace('/login?error=account_inactive')
    }
  }, [user, token, loading, router])

  if (loading || !token || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    )
  }

  if ((isNurseUser(user) || isAdminUser(user)) && (user as { isActive?: boolean }).isActive !== false) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
    </div>
  )
}
