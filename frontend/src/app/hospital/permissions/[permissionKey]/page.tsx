'use client'

import { HospitalPageLayout } from '@/components/hospital/HospitalSidebar'
import PermissionActionPage from '@/components/permissions/PermissionActionPage'
import { decodePermissionKey } from '@/lib/permissions/portal'
import { getPermissionLabel } from '@/lib/accessControlCatalog'

export default function Page({ params }: { params: { permissionKey: string } }) {
  const key = decodePermissionKey(params.permissionKey)
  return (
    <HospitalPageLayout title={getPermissionLabel(key)} subtitle="Granted permission — admin-equivalent access">
      <PermissionActionPage portal="hospital" permissionKeyParam={params.permissionKey} />
    </HospitalPageLayout>
  )
}
