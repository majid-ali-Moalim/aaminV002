import PortalPermissionsView from '@/components/permissions/PortalPermissionsView'
import { DriverPageLayout } from '@/components/driver/DriverPageLayout'

export default function DriverPermissionsPage() {
  return (
    <DriverPageLayout title="My Permissions">
      <PortalPermissionsView portal="driver" />
    </DriverPageLayout>
  )
}
