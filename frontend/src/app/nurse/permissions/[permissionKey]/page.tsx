'use client'

import { NursePageLayout } from '@/components/nurse/NursePageLayout'
import PermissionActionPage from '@/components/permissions/PermissionActionPage'
import { decodePermissionKey } from '@/lib/permissions/portal'
import { getPermissionLabel } from '@/lib/accessControlCatalog'

export default function Page({ params }: { params: { permissionKey: string } }) {
  const key = decodePermissionKey(params.permissionKey)
  return (
    <NursePageLayout title={getPermissionLabel(key)} subtitle="Granted permission — admin-equivalent access">
      <PermissionActionPage portal="nurse" permissionKeyParam={params.permissionKey} />
    </NursePageLayout>
  )
}
