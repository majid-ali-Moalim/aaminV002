'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ExternalLink, Loader2, Shield } from 'lucide-react'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { accessControlService } from '@/lib/api'
import { getPermissionLabel } from '@/lib/accessControlCatalog'
import { iconForPermissionKey } from '@/lib/permissions/icons'
import { hasPermissionAction } from '@/lib/permissions/permissionActionRegistry'
import { portalPermissionActionPath, type PortalId } from '@/lib/permissions/portal'

type Props = {
  portal: PortalId
}

export default function PortalPermissionsView({ portal }: Props) {
  const { grantedKeys, loading, refresh } = usePermissions()
  const [expiredKeys, setExpiredKeys] = useState<string[]>([])

  useEffect(() => {
    accessControlService
      .getMyPermissions()
      .then((data) => {
        const expired =
          data.grantedPermissions?.filter((g) => g.isExpired).map((g) => g.permissionKey) ?? []
        setExpiredKeys(expired)
      })
      .catch(() => setExpiredKeys([]))
  }, [grantedKeys])

  if (loading && grantedKeys.length === 0) {
    return (
      <div className="perm-module-loading">
        <Loader2 className="animate-spin" size={28} />
      </div>
    )
  }

  return (
    <div className="perm-module space-y-5">
      <div className="perm-module-toolbar">
        <p className="text-sm opacity-70">
          Administrator-granted access for your account. Open a permission here — actions use the same tools as the
          admin portal, without leaving your workspace.
        </p>
        <button type="button" className="perm-module-refresh" onClick={() => refresh()}>
          Refresh
        </button>
      </div>

      {expiredKeys.length > 0 && (
        <section className="perm-module-alert">
          <h3>
            <AlertTriangle size={16} /> Expired ({expiredKeys.length})
          </h3>
          <p className="text-xs opacity-80 mb-2">Ask your administrator to grant these again with unlimited duration.</p>
          <ul>
            {expiredKeys.map((key) => (
              <li key={key}>{getPermissionLabel(key)}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="perm-module-card">
        <h3>
          <Shield size={16} /> My permissions ({grantedKeys.length})
        </h3>

        {grantedKeys.length === 0 ? (
          <p className="text-sm opacity-60 py-6">
            No additional permissions assigned yet. Your administrator can grant access from Admin → Access Control.
          </p>
        ) : (
          <div className="perm-module-grid">
            {grantedKeys.map((key) => {
              const Icon = iconForPermissionKey(key)
              const label = getPermissionLabel(key)
              const actionable = hasPermissionAction(key)
              const href = portalPermissionActionPath(portal, key)

              if (actionable) {
                return (
                  <Link key={key} href={href} className="perm-module-item">
                    <div className="perm-module-item-icon">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{label}</p>
                      <p className="text-xs opacity-60 mt-0.5">Same capability as admin</p>
                    </div>
                    <ExternalLink size={16} className="opacity-70 shrink-0" />
                  </Link>
                )
              }

              return (
                <div key={key} className="perm-module-item static">
                  <div className="perm-module-item-icon">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{label}</p>
                    <p className="text-xs opacity-50 mt-0.5">Active — applied in your role workspace</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
