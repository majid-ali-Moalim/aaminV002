'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, Clock, Siren, Truck } from 'lucide-react'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import StatusBadge from '@/components/features/emergency/StatusBadge'

export type OperationalAlertCase = {
  id: string
  trackingCode: string
  status: string
  priority?: string
  pickupLocation?: string | null
  updatedAt?: string
  createdAt?: string
  patient?: { fullName?: string | null } | null
}

export type DriverIncidentAlert = {
  id: string
  title: string
  type: string
  description: string
  priority: string
  driverName: string
  trackingCode: string
  requestId: string
  submittedAt: string
}

type Props = {
  criticalCases: OperationalAlertCase[]
  delayedCases: OperationalAlertCase[]
  driverIncidents: DriverIncidentAlert[]
  caseHref: (id: string) => string
  compact?: boolean
}

function CaseAlertRow({
  item,
  href,
  tone,
}: {
  item: OperationalAlertCase
  href: string
  tone: 'critical' | 'delayed'
}) {
  const border =
    tone === 'critical' ? 'border-red-100 hover:border-red-200' : 'border-amber-100 hover:border-amber-200'
  return (
    <Link
      href={href}
      className={`block rounded-xl border bg-white p-3 transition hover:shadow-sm ${border}`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="font-mono text-xs font-black text-red-600">{item.trackingCode}</span>
        {item.priority && <PriorityBadge priority={item.priority} size="sm" />}
        <StatusBadge status={item.status} size="sm" />
      </div>
      <p className="text-sm font-semibold text-slate-800">
        {item.patient?.fullName || 'Unknown patient'}
      </p>
      {item.pickupLocation && (
        <p className="text-xs text-slate-500 truncate mt-0.5">{item.pickupLocation}</p>
      )}
      {(item.updatedAt || item.createdAt) && (
        <p className="text-[10px] text-slate-400 mt-1">
          {formatDistanceToNow(new Date(item.updatedAt || item.createdAt!), { addSuffix: true })}
        </p>
      )}
    </Link>
  )
}

function IncidentRow({
  item,
  href,
}: {
  item: DriverIncidentAlert
  href: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-orange-100 bg-white p-3 transition hover:border-orange-200 hover:shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <Truck className="w-3.5 h-3.5 text-orange-600" />
        <span className="text-sm font-bold text-slate-900">{item.title}</span>
        {item.priority && <PriorityBadge priority={item.priority} size="sm" />}
      </div>
      <p className="text-xs text-slate-600">
        {item.driverName} · {item.type} · {item.trackingCode}
      </p>
      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
      <p className="text-[10px] text-slate-400 mt-1">
        {formatDistanceToNow(new Date(item.submittedAt), { addSuffix: true })}
      </p>
    </Link>
  )
}

export default function OperationalAlertsPanel({
  criticalCases,
  delayedCases,
  driverIncidents,
  caseHref,
  compact = false,
}: Props) {
  const empty =
    criticalCases.length === 0 && delayedCases.length === 0 && driverIncidents.length === 0

  if (empty) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
        <p className="text-sm text-slate-500">No critical alerts right now — operations look stable.</p>
      </div>
    )
  }

  const limit = compact ? 3 : 8

  return (
    <div className="space-y-6">
      {criticalCases.length > 0 && (
        <section>
          <h3 className="text-xs font-black uppercase tracking-widest text-red-700 flex items-center gap-2 mb-3">
            <Siren className="w-4 h-4" />
            Critical Cases ({criticalCases.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {criticalCases.slice(0, limit).map((c) => (
              <CaseAlertRow key={c.id} item={c} href={caseHref(c.id)} tone="critical" />
            ))}
          </div>
        </section>
      )}

      {delayedCases.length > 0 && (
        <section>
          <h3 className="text-xs font-black uppercase tracking-widest text-amber-700 flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" />
            Delayed Cases ({delayedCases.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {delayedCases.slice(0, limit).map((c) => (
              <CaseAlertRow key={c.id} item={c} href={caseHref(c.id)} tone="delayed" />
            ))}
          </div>
        </section>
      )}

      {driverIncidents.length > 0 && (
        <section>
          <h3 className="text-xs font-black uppercase tracking-widest text-orange-700 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" />
            Driver Field Reports ({driverIncidents.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {driverIncidents.slice(0, limit).map((r) => (
              <IncidentRow key={r.id} item={r} href={caseHref(r.requestId)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
