'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { AlertTriangle } from 'lucide-react'
import OperationalAlertsPanel, {
  type DriverIncidentAlert,
  type OperationalAlertCase,
} from '@/components/shared/OperationalAlertsPanel'

type AlertsPayload = {
  criticalCases?: OperationalAlertCase[]
  delayedCases?: OperationalAlertCase[]
  driverIncidents?: DriverIncidentAlert[]
}

type Props = {
  fetcher: () => Promise<AlertsPayload>
  cacheKey: string
  viewAllHref: string
  caseHref: (id: string) => string
}

export default function OperationalAlertsDashboardStrip({
  fetcher,
  cacheKey,
  viewAllHref,
  caseHref,
}: Props) {
  const { data } = useSWR(cacheKey, fetcher, { refreshInterval: 15000 })

  const critical = data?.criticalCases?.length ?? 0
  const delayed = data?.delayedCases?.length ?? 0
  const incidents = data?.driverIncidents?.length ?? 0
  const total = critical + delayed + incidents

  if (!data || total === 0) return null

  return (
    <section className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <div>
            <h2 className="text-sm font-black text-slate-900">Operational Alerts</h2>
            <p className="text-xs text-slate-500">
              {critical} critical · {delayed} delayed · {incidents} driver reports
            </p>
          </div>
        </div>
        <Link
          href={viewAllHref}
          className="text-xs font-bold uppercase tracking-wide text-orange-700 hover:text-orange-800"
        >
          View all alerts →
        </Link>
      </div>
      <OperationalAlertsPanel
        compact
        criticalCases={data.criticalCases ?? []}
        delayedCases={data.delayedCases ?? []}
        driverIncidents={data.driverIncidents ?? []}
        caseHref={caseHref}
      />
    </section>
  )
}
