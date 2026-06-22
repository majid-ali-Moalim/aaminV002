'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ResetPasswordRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/forgot-password')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
      Redirecting to password reset...
    </div>
  )
}
