'use client'

import { format } from 'date-fns'
import { Activity, Download, FileText, Paperclip, Stethoscope, Truck, User } from 'lucide-react'
import { downloadUploadedFile } from '@/lib/uploads/fileUrl'
import { EmergencyRequest } from '@/types'
import {
  buildReadableCaseTimeline,
  CaseTimelineEvent,
  formatTimelineEventDetails,
} from '@/lib/emergency/caseMissionTimeline'

/** @deprecated Use buildReadableCaseTimeline — kept for PDF export compatibility. */
export function buildCaseTimeline(request: EmergencyRequest): CaseTimelineEvent[] {
  return buildReadableCaseTimeline(request)
}

export type { CaseTimelineEvent }

const kindStyles: Record<CaseTimelineEvent['kind'], string> = {
  created: 'bg-blue-500 ring-blue-100',
  milestone: 'bg-indigo-500 ring-indigo-100',
  status: 'bg-red-500 ring-red-100',
  clinical: 'bg-rose-500 ring-rose-100',
  driver: 'bg-amber-500 ring-amber-100',
  completed: 'bg-emerald-500 ring-emerald-100',
  cancelled: 'bg-slate-400 ring-slate-100',
}

const kindBadge: Partial<Record<CaseTimelineEvent['kind'], { label: string; className: string }>> =
  {
    clinical: { label: 'Clinical', className: 'text-rose-600' },
    driver: { label: 'Driver', className: 'text-amber-600' },
    milestone: { label: 'Milestone', className: 'text-indigo-600' },
  }

function TimelineFields({ fields }: { fields: NonNullable<CaseTimelineEvent['fields']> }) {
  return (
    <dl className="mt-2 rounded-lg border border-slate-100 bg-slate-50/80 divide-y divide-slate-100">
      {fields.map((field) => (
        <div
          key={`${field.label}-${field.value}`}
          className="grid grid-cols-[minmax(7rem,34%)_1fr] gap-x-3 gap-y-0.5 px-3 py-2 text-xs"
        >
          <dt className="font-semibold text-slate-500">{field.label}</dt>
          <dd className="text-slate-800 whitespace-pre-wrap break-words">
            {field.href ? (
              <span className="flex flex-col gap-1.5 items-start">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a
                    href={field.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-red-600 hover:text-red-700 underline break-all"
                  >
                    <Paperclip className="w-3 h-3 shrink-0" />
                    {field.value}
                  </a>
                  <button
                    type="button"
                    onClick={() => void downloadUploadedFile(field.href, field.value)}
                    className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-slate-900"
                  >
                    <Download className="w-3 h-3 shrink-0" />
                    Download
                  </button>
                </span>
                {field.isImage && (
                  <a href={field.href} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={field.href}
                      alt={field.value}
                      className="max-h-40 rounded-lg border border-slate-200 bg-white object-contain"
                    />
                  </a>
                )}
              </span>
            ) : (
              field.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

type Props = {
  request: EmergencyRequest
  compact?: boolean
  hideCrewSummary?: boolean
  hideTitle?: boolean
}

export default function CaseMissionRecordsPanel({
  request,
  compact = false,
  hideCrewSummary = false,
  hideTitle = false,
}: Props) {
  const timeline = buildReadableCaseTimeline(request)
  const driverName = request.driver
    ? `${request.driver.firstName} ${request.driver.lastName}`.trim()
    : null
  const nurseName = request.nurse
    ? `${request.nurse.firstName} ${request.nurse.lastName}`.trim()
    : null

  return (
    <div className="space-y-5">
      {!hideCrewSummary && (
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Truck className="w-3 h-3" /> Ambulance
            </p>
            <p className="text-sm font-bold text-red-600 mt-1">
              {request.ambulance?.ambulanceNumber || 'Unassigned'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3 h-3" /> Driver
            </p>
            <p className="text-sm font-semibold text-slate-800 mt-1">{driverName || 'Unassigned'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Stethoscope className="w-3 h-3" /> Nurse
            </p>
            <p className="text-sm font-semibold text-slate-800 mt-1">{nurseName || 'Unassigned'}</p>
          </div>
        </div>
      )}

      <div>
        {!hideTitle && (
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4" />
            Mission timeline & records
          </h4>
        )}
        {timeline.length === 0 ? (
          <p className="text-sm text-slate-500">No mission records yet.</p>
        ) : (
          <div className={`space-y-3 ${compact ? 'max-h-64 overflow-y-auto pr-1' : ''}`}>
            {timeline.map((event, idx) => {
              const badge = kindBadge[event.kind]
              return (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ring-4 ${kindStyles[event.kind]}`}
                    />
                    {idx < timeline.length - 1 && (
                      <div className="w-px flex-1 bg-slate-200 min-h-[1rem] mt-1" />
                    )}
                  </div>
                  <div className="pb-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="text-sm font-bold text-slate-800">{event.title}</p>
                      {badge && (
                        <span
                          className={`text-[10px] font-bold uppercase ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {format(new Date(event.at), 'PPp')}
                      {event.actor ? ` · ${event.actor}` : ''}
                    </p>
                    {event.subtitle && (
                      <p className="text-xs text-slate-600 mt-1">{event.subtitle}</p>
                    )}
                    {event.fields?.length ? (
                      <TimelineFields fields={event.fields} />
                    ) : event.body ? (
                      <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap flex items-start gap-1">
                        {event.kind === 'driver' && (
                          <FileText className="w-3 h-3 shrink-0 mt-0.5" />
                        )}
                        {event.body}
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export { formatTimelineEventDetails }
