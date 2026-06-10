'use client'

import { usePermissions } from '@/lib/hooks/usePermissions'
import { getPermissionLabel } from '@/lib/accessControlCatalog'
import { Loader2, Shield, Sparkles } from 'lucide-react'

export default function NursePermissionsView() {
  const { permissions, grantedKeys, baselineKeys, loading, refresh } = usePermissions()

  if (loading && permissions.length === 0) {
    return (
      <div className="nurse-loading">
        <Loader2 className="animate-spin" size={28} />
      </div>
    )
  }

  const allKeys = [...new Set([...baselineKeys, ...grantedKeys])]

  return (
    <div className="space-y-5">
      <div className="nurse-toolbar">
        <p className="text-sm text-zinc-400">Permissions assigned to your nurse account</p>
        <button type="button" className="nurse-btn ghost" onClick={() => refresh()}>
          Refresh
        </button>
      </div>

      {baselineKeys.length > 0 && (
        <section className="nurse-perm-section baseline">
          <h3>
            <Sparkles size={16} /> Built-in role access ({baselineKeys.length})
          </h3>
          <ul>
            {baselineKeys.map((key) => (
              <li key={key}>{getPermissionLabel(key)}</li>
            ))}
          </ul>
        </section>
      )}

      {grantedKeys.length > 0 && (
        <section className="nurse-perm-section granted">
          <h3>
            <Shield size={16} /> Admin-granted ({grantedKeys.length})
          </h3>
          <ul>
            {grantedKeys.map((key) => (
              <li key={key}>{getPermissionLabel(key)}</li>
            ))}
          </ul>
        </section>
      )}

      {allKeys.length === 0 && (
        <div className="nurse-empty-card">No permission records loaded. Contact your administrator.</div>
      )}
    </div>
  )
}
