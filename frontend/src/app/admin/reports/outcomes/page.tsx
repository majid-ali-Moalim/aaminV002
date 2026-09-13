'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Case Outcome Reports removed — redirect to Handover & Transfer Outcomes. */
export default function OutcomesReportsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/reports/handover-outcomes')
  }, [router])
  return null
}
