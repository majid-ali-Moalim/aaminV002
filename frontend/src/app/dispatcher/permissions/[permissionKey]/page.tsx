'use client'

import PermissionActionPage from '@/components/permissions/PermissionActionPage'
import { decodePermissionKey } from '@/lib/permissions/portal'
import { getPermissionLabel } from '@/lib/accessControlCatalog'

export default function Page({ params }: { params: { permissionKey: string } }) {
  const key = decodePermissionKey(params.permissionKey)
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="text-lg font-black text-slate-900">{getPermissionLabel(key)}</h1>
      </div>
      <PermissionActionPage portal="dispatcher" permissionKeyParam={params.permissionKey} />
    </div>
  )
}
