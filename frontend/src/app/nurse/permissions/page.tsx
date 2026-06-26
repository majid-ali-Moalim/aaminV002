'use client'

import { NursePageLayout } from '@/components/nurse/NursePageLayout'
import PortalPermissionsView from '@/components/permissions/PortalPermissionsView'

export default function Page() {
  return (
    <NursePageLayout title="My Permissions" subtitle="Administrator-granted access for your account">
      <PortalPermissionsView portal="nurse" />
    </NursePageLayout>
  )
}
