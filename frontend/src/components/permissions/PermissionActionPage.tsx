'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPermissionLabel } from '@/lib/accessControlCatalog'
import { useGrantedAccessGate } from '@/lib/hooks/useGrantedAccessGate'
import {
  decodePermissionKey,
  portalPermissionsPath,
  type PortalId,
} from '@/lib/permissions/portal'
import {
  getPermissionRegistryEntry,
  hasPermissionAction,
} from '@/lib/permissions/permissionActionRegistry'

type Props = {
  portal: PortalId
  permissionKeyParam: string
}

export default function PermissionActionPage({ portal, permissionKeyParam }: Props) {
  const permissionKey = decodePermissionKey(permissionKeyParam)
  const backHref = portalPermissionsPath(portal)
  const label = getPermissionLabel(permissionKey)
  const { allowed, ready, refresh, hadAccess } = useGrantedAccessGate(permissionKey, backHref)
  const entry = getPermissionRegistryEntry(permissionKey)

  const [ActionComponent, setActionComponent] = useState<React.ComponentType<any> | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!entry) return
    let cancelled = false
    entry
      .load()
      .then((mod) => {
        if (!cancelled) setActionComponent(() => mod.default)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [entry, permissionKey])

  if (!hasPermissionAction(permissionKey)) {
    return (
      <div className="perm-module-card p-6">
        <p className="text-sm opacity-70">
          <strong>{label}</strong> is active on your account and applies within your portal features.
        </p>
        <Link href={backHref} className="perm-module-back inline-flex mt-4">
          <ArrowLeft size={16} /> Back to My Permissions
        </Link>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="perm-module-loading">
        <Loader2 className="animate-spin" size={28} />
      </div>
    )
  }

  if (!allowed && !hadAccess) return null

  if (loadError || !ActionComponent) {
    return (
      <div className="perm-module-loading">
        <Loader2 className="animate-spin" size={28} />
      </div>
    )
  }

  const ctx = { portal, permissionKey, backHref }
  const componentProps = {
    ...(entry?.props?.(ctx) ?? {}),
    onSubmitForbidden: async (message: string) => {
      await refresh({ silent: true })
      toast.error(message, { duration: 6000 })
    },
  }

  if (entry?.fullBleed) {
    return (
      <>
        <div className="perm-module-action-bar">
          <Link href={backHref} className="perm-module-back">
            <ArrowLeft size={16} /> Back to My Permissions
          </Link>
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <ActionComponent {...componentProps} />
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="perm-module-action-bar">
        <Link href={backHref} className="perm-module-back">
          <ArrowLeft size={16} /> Back to My Permissions
        </Link>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="perm-module-embed">
        <ActionComponent {...componentProps} />
      </div>
    </div>
  )
}
