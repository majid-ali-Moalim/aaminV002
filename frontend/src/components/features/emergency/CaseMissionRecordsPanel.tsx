'use client'

import { format } from 'date-fns'
import { Activity, FileText, Stethoscope, Truck, User } from 'lucide-react'
import { EmergencyRequest } from '@/types'
import {
  parseClinicalRecord,
  parseHandover,
  parseMonitoring,
} from '@/lib/nurse/patientCareTypes'

export type CaseTimelineEvent = {
  id: string
  at: string
  kind: 'created' | 'status' | 'nurse' | 'driver' | 'completed' | 'cancelled'
  title: string
  body?: string
  actor?: string
}

function nurseRecordTitle(record: NonNullable<EmergencyRequest['patientCareRecords']>[number]) {
  if (parseClinicalRecord(record.clinicalNotes)) return 'Patient assessment'
  if (parseMonitoring(record.clinicalNotes)) return 'Treatment & monitoring'
  if (parseHandover(record.clinicalNotes)) return 'Hospital handover'
  if (record.treatmentGiven) return `Treatment · ${record.treatmentGiven}`
  if (record.clinicalNotes?.toLowerCase().includes('patient loaded')) return 'Patient loaded'
  return 'Nurse clinical note'
}

function nurseRecordBody(record: NonNullable<EmergencyRequest['patientCareRecords']>[number]) {
  const assessment = parseClinicalRecord(record.clinicalNotes)
  if (assessment) {
    return [
      assessment.chiefComplaint && `Chief complaint: ${assessment.chiefComplaint}`,
      assessment.symptoms && `Symptoms: ${assessment.symptoms}`,
      assessment.assessmentNotes && `Notes: ${assessment.assessmentNotes}`,
    ]
      .filter(Boolean)
      .join('\n')
  }
  const monitoring = parseMonitoring(record.clinicalNotes)
  if (monitoring) {
    return [
      monitoring.condition && `Condition: ${monitoring.condition}`,
      monitoring.notes && `Notes: ${monitoring.notes}`,
    ]
      .filter(Boolean)
      .join('\n')
  }
  const handover = parseHandover(record.clinicalNotes)
  if (handover) {
    return [
      handover.patientOutcome && `Status: ${handover.patientOutcome}`,
      handover.patientCondition && `Condition: ${handover.patientCondition}`,
      handover.treatmentGiven && `Treatment: ${handover.treatmentGiven}`,
      handover.notes && `Notes: ${handover.notes}`,
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    record.treatmentGiven && `Treatment: ${record.treatmentGiven}`,
    record.medications && `Medication: ${record.medications}`,
    record.clinicalNotes,
  ]
    .filter(Boolean)
    .join('\n')
}

function logActor(log: NonNullable<EmergencyRequest['statusLogs']>[number]) {
  const emp = log.changedByEmployee
  if (!emp) return undefined
  const role = emp.employeeRole?.name?.toLowerCase() ?? ''
  const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
  if (role.includes('nurse')) return name ? `Nurse · ${name}` : 'Nurse'
  if (role.includes('driver')) return name ? `Driver · ${name}` : 'Driver'
  return name || undefined
}

export function buildCaseTimeline(request: EmergencyRequest): CaseTimelineEvent[] {
  const events: CaseTimelineEvent[] = [
    {
      id: 'created',
      at: request.createdAt,
      kind: 'created',
      title: 'Case requested',
      body: request.pickupLocation || undefined,
    },
  ]

  for (const log of request.statusLogs ?? []) {
    const isDriverReport = log.notes?.includes('[Driver Report]')
    const isNurseLog = log.notes?.startsWith('[Nurse]')
    events.push({
      id: log.id,
      at: log.createdAt,
      kind: isDriverReport ? 'driver' : isNurseLog ? 'nurse' : 'status',
      title: isDriverReport
        ? 'Driver report'
        : isNurseLog
          ? log.notes!.replace(/^\[Nurse\]\s*/, '')
          : log.toStatus.replace(/_/g, ' '),
      body: isDriverReport
        ? log.notes?.replace('[Driver Report]', '').trim()
        : log.notes && log.fromStatus !== log.toStatus
          ? log.notes
          : log.notes || undefined,
      actor: logActor(log),
    })
  }

  for (const record of request.patientCareRecords ?? []) {
    const nurse = record.nurse
    const nurseLabel = nurse
      ? [nurse.firstName, nurse.lastName].filter(Boolean).join(' ')
      : undefined
    events.push({
      id: `care-${record.id}`,
      at: record.createdAt,
      kind: 'nurse',
      title: nurseRecordTitle(record),
      body: nurseRecordBody(record) || undefined,
      actor: nurseLabel ? `Nurse · ${nurseLabel}` : 'Nurse',
    })
  }

  if (request.completedAt) {
    events.push({
      id: 'completed',
      at: request.completedAt,
      kind: 'completed',
      title: 'Case completed',
    })
  } else if (request.cancelledAt) {
    events.push({
      id: 'cancelled',
      at: request.cancelledAt,
      kind: 'cancelled',
      title: 'Case cancelled',
      body: request.cancellationReason || undefined,
    })
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}

const kindStyles: Record<CaseTimelineEvent['kind'], string> = {
  created: 'bg-blue-500 ring-blue-100',
  status: 'bg-red-500 ring-red-100',
  nurse: 'bg-rose-500 ring-rose-100',
  driver: 'bg-amber-500 ring-amber-100',
  completed: 'bg-emerald-500 ring-emerald-100',
  cancelled: 'bg-slate-400 ring-slate-100',
}

type Props = {
  request: EmergencyRequest
  compact?: boolean
}

export default function CaseMissionRecordsPanel({ request, compact = false }: Props) {
  const timeline = buildCaseTimeline(request)
  const driverName = request.driver
    ? `${request.driver.firstName} ${request.driver.lastName}`.trim()
    : null
  const nurseName = request.nurse
    ? `${request.nurse.firstName} ${request.nurse.lastName}`.trim()
    : null

  return (
    <div className="space-y-5">
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

      <div>
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4" />
          Case timeline (request → completion)
        </h4>
        {timeline.length === 0 ? (
          <p className="text-sm text-slate-500">No mission records yet.</p>
        ) : (
          <div className={`space-y-3 ${compact ? 'max-h-64 overflow-y-auto pr-1' : ''}`}>
            {timeline.map((event, idx) => (
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
                    {event.kind === 'nurse' && (
                      <span className="text-[10px] font-bold uppercase text-rose-600">Nurse note</span>
                    )}
                    {event.kind === 'driver' && (
                      <span className="text-[10px] font-bold uppercase text-amber-600">Driver</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {format(new Date(event.at), 'PPp')}
                    {event.actor ? ` · ${event.actor}` : ''}
                  </p>
                  {event.body && (
                    <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap flex items-start gap-1">
                      {event.kind === 'driver' && <FileText className="w-3 h-3 shrink-0 mt-0.5" />}
                      {event.body}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
