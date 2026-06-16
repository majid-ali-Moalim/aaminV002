'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { isHospitalUser } from '@/lib/authRedirect'

interface HospitalGuardProps {
  children: ReactNode
}

export function HospitalGuard({ children }: HospitalGuardProps) {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/hospital/login')
      return
    }
    if (!isHospitalUser(user)) {
      router.push('/login?error=hospital_only')
      return
    }
    if (user.isActive === false) {
      router.push('/hospital/login?error=account_inactive')
    }
  }, [user, isAuthenticated, router])

  if (!isAuthenticated || !user || !isHospitalUser(user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
      </div>
    )
  }

  return <>{children}</>
}
