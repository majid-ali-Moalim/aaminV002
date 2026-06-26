'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { HospitalPageLayout } from '@/components/hospital/HospitalSidebar'
import PortalPermissionsView from '@/components/permissions/PortalPermissionsView'

export default function HospitalPermissionsPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <HospitalPageLayout title="My Permissions" subtitle="Administrator-granted access for your hospital account">
      {!mounted ? (
        <div className="hosp-loading">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : (
        <PortalPermissionsView portal="hospital" />
      )}
    </HospitalPageLayout>
  )
}
