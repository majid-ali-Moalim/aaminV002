'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MasterDataIndexPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/master-data/locations')
  }, [router])
  return null
}
