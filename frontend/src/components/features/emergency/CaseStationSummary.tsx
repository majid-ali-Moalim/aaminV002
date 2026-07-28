'use client'

import { Building2 } from 'lucide-react'
import type { EmergencyRequest } from '@/types'
import { getCaseStationLabels } from '@/lib/emergency/caseStationLabels'

export default function CaseStationSummary({ request }: { request: EmergencyRequest }) {
  const { assignedStation, transferredFromStation } = getCaseStationLabels(request)

  if (!assignedStation && !transferredFromStation) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        <Building2 className="w-3.5 h-3.5" />
        Station routing
      </p>
      {transferredFromStation && (
        <p className="text-sm text-slate-800">
          <span className="font-semibold text-slate-600">Transferred from: </span>
          {transferredFromStation}
        </p>
      )}
      {assignedStation && (
        <p className="text-sm text-slate-800">
          <span className="font-semibold text-slate-600">Assigned station: </span>
          {assignedStation}
        </p>
      )}
    </div>
  )
}
