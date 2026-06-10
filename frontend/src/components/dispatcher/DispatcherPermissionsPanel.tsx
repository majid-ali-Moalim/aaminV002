'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Shield, Sparkles, ExternalLink, Lock, AlertTriangle } from 'lucide-react'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { accessControlService } from '@/lib/api'
import {
  buildPermissionFeatures,
  iconForPermission,
  PERMISSION_ACTION_LINKS,
} from '@/lib/dispatcher/permissionModules'
import { getPermissionLabel } from '@/lib/accessControlCatalog'

export default function DispatcherPermissionsPanel({ view }: { view: string }) {
  const { permissions, grantedKeys, baselineKeys, loading, refresh } = usePermissions()
  const [expiredKeys, setExpiredKeys] = useState<string[]>([])
  const showGrantedOnly = view === 'granted'

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

  const features = buildPermissionFeatures(baselineKeys, grantedKeys)
  const visible = showGrantedOnly
    ? features.filter((f) => f.source === 'granted')
    : features

  if (loading && permissions.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">
            {showGrantedOnly ? 'Admin-granted access' : 'All my capabilities'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {showGrantedOnly
              ? 'Extra permissions assigned by an administrator — these unlock new sidebar modules and actions.'
              : 'Built-in dispatcher access plus anything your administrator granted.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="text-xs font-bold text-red-600 hover:underline"
        >
          Refresh access
        </button>
      </div>

      {!showGrantedOnly && baselineKeys.length > 0 && (
        <section className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-1.5 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Built-in role access ({baselineKeys.length})
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {baselineKeys.map((key) => {
              const Icon = iconForPermission(key)
              const action = PERMISSION_ACTION_LINKS[key]
              return (
                <CapabilityCard
                  key={key}
                  icon={Icon}
                  label={getPermissionLabel(key)}
                  badge="Built-in"
                  badgeClass="bg-emerald-100 text-emerald-800"
                  href={action?.href}
                />
              )
            })}
          </div>
        </section>
      )}

      {!showGrantedOnly && expiredKeys.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            Expired access ({expiredKeys.length})
          </p>
          <p className="text-xs text-amber-900 mb-2">
            These permissions expired and no longer work. Ask your administrator to grant them again with{' '}
            <strong>unlimited duration</strong>.
          </p>
          <ul className="space-y-1">
            {expiredKeys.map((key) => (
              <li key={key} className="text-sm font-semibold text-amber-900">
                {getPermissionLabel(key)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-600 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            {showGrantedOnly ? `Granted by admin (${grantedKeys.length})` : `Admin granted (${grantedKeys.length})`}
          </p>
        </div>
        {grantedKeys.length === 0 ? (
          <p className="text-sm text-slate-500 px-5 py-8">
            No additional permissions yet. Your administrator can grant extras such as Create Driver or Create Nurse.
          </p>
        ) : (
          <div className="p-4 grid sm:grid-cols-2 gap-3">
            {grantedKeys.map((key) => {
              const Icon = iconForPermission(key)
              const action = PERMISSION_ACTION_LINKS[key]
              if (showGrantedOnly || !baselineKeys.includes(key)) {
                return (
                  <CapabilityCard
                    key={key}
                    icon={Icon}
                    label={getPermissionLabel(key)}
                    badge="Granted"
                    badgeClass="bg-red-100 text-red-800"
                    href={action?.href}
                  />
                )
              }
              return null
            })}
          </div>
        )}
      </section>

      {showGrantedOnly && visible.length === 0 && grantedKeys.length > 0 && (
        <p className="text-sm text-slate-500">Showing {grantedKeys.length} granted permission(s).</p>
      )}
    </div>
  )
}

function CapabilityCard({
  icon: Icon,
  label,
  badge,
  badgeClass,
  href,
}: {
  icon: typeof Lock
  label: string
  badge: string
  badgeClass: string
  href?: string
}) {
  const inner = (
    <>
      <div className="p-2 rounded-xl bg-slate-100 text-slate-600 shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900">{label}</p>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-1 ${badgeClass}`}>
          {badge}
        </span>
      </div>
      {href && <ExternalLink className="w-4 h-4 text-red-500 shrink-0" />}
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-red-200 hover:bg-red-50/30 transition-colors"
      >
        {inner}
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
      {inner}
    </div>
  )
}
