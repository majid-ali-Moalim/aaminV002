import PermissionActionPage from '@/components/permissions/PermissionActionPage'
import { DriverPageLayout } from '@/components/driver/DriverPageLayout'
import { decodePermissionKey } from '@/lib/permissions/portal'
import { getPermissionLabel } from '@/lib/accessControlCatalog'

export default function DriverPermissionActionPage({
  params,
}: {
  params: { permissionKey: string }
}) {
  const key = decodePermissionKey(params.permissionKey)

  return (
    <DriverPageLayout title={getPermissionLabel(key)}>
      <PermissionActionPage portal="driver" permissionKeyParam={params.permissionKey} />
    </DriverPageLayout>
  )
}
