'use client'

import { format } from 'date-fns'
import { Clock, Timer } from 'lucide-react'
import type { EmergencyRequest } from '@/types'
import {
  buildCaseTimingRows,
  caseTimingSummary,
  formatDurationMinutes,
} from '@/lib/emergency/caseTimingMetrics'

export default function CaseTimingPanel({ request }: { request: EmergencyRequest }) {
  const rows = buildCaseTimingRows(request)
  const summary = caseTimingSummary(request)

  return (
    <section className="case-detail-card case-detail-card--accent">
      <h2 className="case-detail-section-title">
        <Timer className="w-4 h-4" />
        Response & mission timing
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Request, assignment, travel, and completion timestamps for this case.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Waiting', value: summary.waitingMinutes },
          { label: 'Reach patient', value: summary.responseMinutes },
          { label: 'Reach hospital', value: summary.transportMinutes },
          { label: 'Total time', value: summary.totalMinutes },
        ].map((item) => (
          <div key={item.label} className="case-detail-stat-tile">
            <p className="case-detail-label">{item.label}</p>
            <p className="case-detail-value highlight">{formatDurationMinutes(item.value)}</p>
          </div>
        ))}
      </div>

      <div className="space-y-0 divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
        {rows.map((row) => (
          <div
            key={row.key}
            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 ${
              row.highlight ? 'bg-red-50/60' : 'bg-white'
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">{row.label}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 shrink-0" />
                {row.timestamp ? format(new Date(row.timestamp), 'PPp') : 'Not recorded yet'}
              </p>
            </div>
            {row.durationLabel && (
              <div className="sm:text-right shrink-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {row.durationLabel}
                </p>
                <p className="text-sm font-black text-red-700">
                  {formatDurationMinutes(row.durationMinutes)}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
