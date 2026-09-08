import { EmergencyRequest } from '@/types'
import {
  buildHandoverFields,
  buildLoadPatientFields,
  buildMedicalNotesFields,
  buildMonitoringFields,
  CaseFileField,
} from '@/lib/nurse/clinicalRecordDisplay'
import {
  findLatestAssessmentRecord,
  findLatestHandoverRecord,
  isHandoverRecord,
  isLoadPatientRecord,
  isMonitoringRecord,
  parseHandover,
} from '@/lib/nurse/patientCareTypes'

export type CaseTimelineEvent = {
  id: string
  at: string
  kind: 'created' | 'milestone' | 'status' | 'clinical' | 'driver' | 'completed' | 'cancelled'
  title: string
  subtitle?: string
  fields?: CaseFileField[]
  body?: string
  actor?: string
}

type CareRecord = NonNullable<EmergencyRequest['patientCareRecords']>[number]
type StatusLog = NonNullable<EmergencyRequest['statusLogs']>[number]

const STATUS_EVENT_LABELS: Record<string, string> = {
  PENDING: 'Request pending',
  REVIEWING: 'Under review',
  ASSIGNED: 'Team assigned',
  DISPATCHED: 'Case started',
  EN_ROUTE: 'En route to pickup',
  ARRIVED_SCENE: 'Arrived at scene',
  PATIENT_STABILIZED: 'Patient stabilized on scene',
  TRANSPORTING: 'Transporting to hospital',
  ARRIVED_HOSPITAL: 'Arrived at hospital',
  COMPLETED: 'Case completed',
  CANCELLED: 'Case cancelled',
}

const MILESTONE_STATUSES = new Set(['ASSIGNED', 'DISPATCHED', 'COMPLETED', 'CANCELLED'])

function logActor(log: StatusLog): string | undefined {
  const emp = log.changedByEmployee
  if (!emp) return undefined
  const role = emp.employeeRole?.name?.toLowerCase() ?? ''
  const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
  if (role.includes('nurse')) return name ? `Nurse · ${name}` : 'Nurse'
  if (role.includes('driver')) return name ? `Driver · ${name}` : 'Driver'
  if (role.includes('dispatch')) return name ? `Dispatcher · ${name}` : 'Dispatcher'
  return name || undefined
}

function nurseActor(record: CareRecord): string | undefined {
  const nurse = record.nurse
  const name = nurse ? [nurse.firstName, nurse.lastName].filter(Boolean).join(' ') : ''
  return name ? `Nurse · ${name}` : 'Nurse'
}

function driverActor(request: EmergencyRequest): string | undefined {
  if (!request.driver) return undefined
  const name = `${request.driver.firstName || ''} ${request.driver.lastName || ''}`.trim()
  return name ? `Driver · ${name}` : 'Driver'
}

function statusTitle(log: StatusLog): string {
  const note = log.notes?.trim() ?? ''
  if (note.includes('Driver started case')) return 'Case started'
  if (note.includes('Team assigned')) return 'Team assigned'
  return STATUS_EVENT_LABELS[log.toStatus] ?? log.toStatus.replace(/_/g, ' ')
}

function isDuplicateEvent(
  events: CaseTimelineEvent[],
  candidate: Pick<CaseTimelineEvent, 'title' | 'at'>,
  windowMs = 90_000,
): boolean {
  const t = new Date(candidate.at).getTime()
  return events.some(
    (e) =>
      e.title === candidate.title &&
      Math.abs(new Date(e.at).getTime() - t) <= windowMs,
  )
}

function shouldSkipStatusLog(log: StatusLog, request: EmergencyRequest): boolean {
  const note = log.notes?.trim() ?? ''
  if (note.startsWith('[Nurse]')) return true
  if (log.toStatus === 'ASSIGNED' && request.assignedAt) return true
  if (log.toStatus === 'DISPATCHED') {
    if (request.dispatchedAt) return true
    if (note.includes('Driver started case')) return true
  }
  if (log.toStatus === 'COMPLETED' && request.completedAt) return true
  if (log.toStatus === 'CANCELLED' && request.cancelledAt) return true
  if (MILESTONE_STATUSES.has(log.toStatus) && log.fromStatus === log.toStatus && !note) {
    return true
  }
  return false
}

function pushMilestone(
  events: CaseTimelineEvent[],
  id: string,
  at: string | null | undefined,
  title: string,
  kind: CaseTimelineEvent['kind'],
  actor?: string,
  subtitle?: string,
) {
  if (!at) return
  if (isDuplicateEvent(events, { title, at })) return
  events.push({ id, at, kind, title, actor, subtitle })
}

function isStubTreatmentRecord(record: CareRecord): boolean {
  if (isLoadPatientRecord(record) || isHandoverRecord(record) || isMonitoringRecord(record)) {
    return false
  }
  const hasStructuredNotes = Boolean(
    record.clinicalNotes?.includes('[EADS_') ||
      record.bloodPressure ||
      record.heartRate ||
      record.temperature ||
      record.oxygenSaturation ||
      record.respiratoryRate ||
      record.medications,
  )
  return Boolean(record.treatmentGiven?.trim()) && !hasStructuredNotes
}

/** Human-readable mission timeline — milestones, filtered status changes, structured clinical records. */
export function buildReadableCaseTimeline(request: EmergencyRequest): CaseTimelineEvent[] {
  const events: CaseTimelineEvent[] = []
  const records = request.patientCareRecords ?? []

  events.push({
    id: 'created',
    at: request.createdAt,
    kind: 'created',
    title: 'Case requested',
    subtitle: request.pickupLocation?.trim() || undefined,
  })

  pushMilestone(
    events,
    'milestone-assigned',
    request.assignedAt,
    'Crew assigned',
    'milestone',
    undefined,
  )

  pushMilestone(
    events,
    'milestone-started',
    request.dispatchedAt,
    'Case started',
    'milestone',
    driverActor(request),
  )

  const seenStatusKeys = new Set<string>()
  for (const log of request.statusLogs ?? []) {
    if (shouldSkipStatusLog(log, request)) continue

    const title = statusTitle(log)
    const note = log.notes?.trim() ?? ''
    const isDriverReport = note.includes('[Driver Report]')
    const key = `${log.toStatus}|${title}|${note.slice(0, 40)}`
    if (seenStatusKeys.has(key)) continue
    seenStatusKeys.add(key)

    if (isDuplicateEvent(events, { title, at: log.createdAt })) continue

    if (isDriverReport) {
      events.push({
        id: log.id,
        at: log.createdAt,
        kind: 'driver',
        title: 'Driver report',
        body: note.replace('[Driver Report]', '').trim() || undefined,
        actor: logActor(log),
      })
      continue
    }

    const humanNote =
      note &&
      !note.startsWith('[Nurse]') &&
      title !== note &&
      !Object.values(STATUS_EVENT_LABELS).includes(note)
        ? note
        : undefined

    events.push({
      id: log.id,
      at: log.createdAt,
      kind: 'status',
      title,
      body: humanNote,
      actor: logActor(log),
    })
  }

  for (const record of records) {
    if (isLoadPatientRecord(record)) {
      const fields = buildLoadPatientFields(record)
      if (isDuplicateEvent(events, { title: 'Patient loaded', at: record.createdAt })) continue
      events.push({
        id: `care-load-${record.id}`,
        at: record.createdAt,
        kind: 'clinical',
        title: 'Patient loaded',
        fields: fields.length ? fields : undefined,
        actor: nurseActor(record),
      })
    }
  }

  const assessmentRecord = findLatestAssessmentRecord(records)
  if (assessmentRecord) {
    const fields = buildMedicalNotesFields(assessmentRecord)
    if (fields.length) {
      const assessmentCount = records.filter(
        (r) => r.clinicalNotes?.includes('[EADS_ASSESSMENT]'),
      ).length
      events.push({
        id: `care-notes-${assessmentRecord.id}`,
        at: assessmentRecord.createdAt,
        kind: 'clinical',
        title: assessmentCount > 1 ? 'Medical notes updated' : 'Medical notes saved',
        fields,
        actor: nurseActor(assessmentRecord),
      })
    }
  }

  const monitoringRecords = records
    .filter(isMonitoringRecord)
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
    )
  if (monitoringRecords[0]) {
    const record = monitoringRecords[0]
    const fields = buildMonitoringFields(record)
    if (fields.length) {
      events.push({
        id: `care-monitor-${record.id}`,
        at: record.createdAt,
        kind: 'clinical',
        title: 'Patient monitoring',
        fields,
        actor: nurseActor(record),
      })
    }
  }

  const handoverRecord = findLatestHandoverRecord(records)
  if (handoverRecord) {
    const handover = parseHandover(handoverRecord.clinicalNotes)
    const fields = buildHandoverFields(handoverRecord)
    if (handover && fields.length) {
      events.push({
        id: `care-handover-${handoverRecord.id}`,
        at: handoverRecord.createdAt,
        kind: 'clinical',
        title: 'Hospital handover',
        fields,
        actor: nurseActor(handoverRecord),
      })
    }
  }

  for (const record of records) {
    if (isStubTreatmentRecord(record)) continue
    if (
      isLoadPatientRecord(record) ||
      record.id === assessmentRecord?.id ||
      record.id === handoverRecord?.id ||
      record.id === monitoringRecords[0]?.id
    ) {
      continue
    }
    if (record.clinicalNotes?.includes('[EADS_')) continue
    const note = record.clinicalNotes?.trim()
    const treatment = record.treatmentGiven?.trim()
    if (!note && !treatment && !record.medications) continue
    events.push({
      id: `care-misc-${record.id}`,
      at: record.createdAt,
      kind: 'clinical',
      title: record.activityLabel?.trim() || 'Clinical note',
      body: [treatment && `Treatment: ${treatment}`, record.medications && `Medication: ${record.medications}`, note]
        .filter(Boolean)
        .join('\n'),
      actor: nurseActor(record),
    })
  }

  if (request.completedAt) {
    pushMilestone(
      events,
      'completed',
      request.completedAt,
      'Case completed',
      'completed',
    )
  } else if (request.cancelledAt) {
    events.push({
      id: 'cancelled',
      at: request.cancelledAt,
      kind: 'cancelled',
      title: 'Case cancelled',
      body: request.cancellationReason?.trim() || undefined,
    })
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}

export function formatTimelineEventDetails(event: CaseTimelineEvent): string {
  if (event.fields?.length) {
    return event.fields
      .map((f) => `${f.label}: ${f.value}${f.href ? ` (${f.href})` : ''}`)
      .join('\n')
  }
  return [event.subtitle, event.body].filter(Boolean).join('\n') || '—'
}
