import type { EmergencyRequest } from '@/types'
import { buildCaseTimeline } from '@/components/features/emergency/CaseMissionRecordsPanel'
import { formatTimelineEventDetails } from '@/lib/emergency/caseMissionTimeline'
import { buildCallerReport } from '@/lib/emergency/callerReport'
import { buildCaseTimingRows } from '@/lib/emergency/caseTimingMetrics'
import {
  formatBloodType,
  formatDateTimeShort,
  formatGender,
  formatPatientAge,
} from '@/lib/patients/patientDisplay'

function empName(employee?: { firstName?: string | null; lastName?: string | null } | null): string {
  if (!employee) return '—'
  const name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
  return name || '—'
}

function parseRequestType(notes?: string | null, requestSource?: string | null): string {
  if (notes?.includes('Request Type: Referral') || requestSource === 'REFERRAL') return 'Referral'
  if (notes?.includes('Request Type: Non-Emergency')) return 'Non-Emergency'
  if (notes?.includes('Request Type: Emergency')) return 'Emergency'
  return 'Emergency'
}

export type PatientCasesPdfFilters = {
  search?: string
  status?: string
  priority?: string
  patientFilter?: string
  activeOnly?: boolean
  closedOnly?: boolean
}

export function buildPatientCasesFilterScope(
  filters: PatientCasesPdfFilters,
  caseCount: number,
): { scopeNote: string; filterDescription: string; isFiltered: boolean } {
  const parts: string[] = []
  if (filters.closedOnly) parts.push('Scope: Closed cases only')
  else if (filters.activeOnly) parts.push('Scope: Active cases only')
  else parts.push('Scope: All patient cases')

  if (filters.patientFilter?.trim()) parts.push(`Patient filter: ${filters.patientFilter.trim()}`)
  if (filters.search?.trim()) parts.push(`Search: "${filters.search.trim()}"`)
  if (filters.status) parts.push(`Status: ${filters.status.replace(/_/g, ' ')}`)
  if (filters.priority) parts.push(`Priority: ${filters.priority}`)

  const isFiltered = Boolean(
    filters.search?.trim() ||
      filters.status ||
      filters.priority ||
      filters.patientFilter?.trim() ||
      filters.activeOnly ||
      filters.closedOnly,
  )

  const filterDescription = parts.join(' · ')
  const scopeNote = isFiltered
    ? `This dossier contains ${caseCount} case(s) matching your filters (${filterDescription}). Patient contacts, mission updates, and clinical timeline are included for each case.`
    : `This dossier contains ${caseCount} case(s) with full patient and mission update details for the selected scope.`

  return { scopeNote, filterDescription, isFiltered }
}

export function buildCasesOverviewTable(cases: EmergencyRequest[]) {
  return {
    title: 'Cases overview',
    columns: [
      'Case #',
      'Patient',
      'Phone',
      'Type',
      'Priority',
      'Status',
      'Ambulance',
      'Created',
      'Completed / closed',
    ],
    rows: cases.map((req) => [
      req.trackingCode,
      req.patient?.fullName || 'Unknown',
      req.patient?.phone || req.callerPhone || '—',
      parseRequestType(req.notes, req.requestSource),
      req.priority,
      req.status.replace(/_/g, ' '),
      req.ambulance?.ambulanceNumber || '—',
      formatDateTimeShort(req.createdAt),
      formatDateTimeShort(req.completedAt || req.cancelledAt),
    ]),
  }
}

export function buildCaseSummaryStats(cases: EmergencyRequest[]) {
  const completed = cases.filter((c) => c.status === 'COMPLETED').length
  const cancelled = cases.filter((c) => c.status === 'CANCELLED').length
  const active = cases.filter((c) => !['COMPLETED', 'CANCELLED', 'FAILED', 'ARRIVED_HOSPITAL'].includes(c.status)).length
  return [
    { label: 'Cases in report', value: cases.length },
    { label: 'Completed', value: completed },
    { label: 'Cancelled', value: cancelled },
    { label: 'In progress', value: active },
  ]
}

export function buildPatientRelativeSection(req: EmergencyRequest): [string, string][] {
  const p = req.patient
  const rows: [string, string][] = [
    ['Patient name', p?.fullName || 'Unknown'],
    ['Patient ID', p?.patientCode || '—'],
    ['Patient phone', p?.phone || req.callerPhone || '—'],
    ['Age', p ? formatPatientAge(p) : '—'],
    ['Gender', p ? formatGender(p.gender) : '—'],
    ['Blood group', p ? formatBloodType(p.bloodType) : '—'],
    ['Address', p?.address || '—'],
    ['Nationality', p?.nationalityType?.replace(/_/g, ' ') || '—'],
    ['Allergies', p?.allergies || '—'],
    ['Conditions', p?.conditions || '—'],
    ['Insurance', p?.insuranceProvider || '—'],
    ['Request source', req.requestSource?.replace(/_/g, ' ') || '—'],
  ]
  return rows
}

export function buildMissionSection(req: EmergencyRequest): [string, string][] {
  return [
    ['Case number', req.trackingCode],
    ['Request type', parseRequestType(req.notes, req.requestSource)],
    ['Emergency category', req.incidentCategory?.name || '—'],
    ['Priority', req.priority],
    ['Current status', req.status.replace(/_/g, ' ')],
    ['Region', req.region?.name || '—'],
    ['District', req.district?.name || '—'],
    ['Station', req.station?.name || '—'],
    ['Pickup location', req.pickupLocation],
    ['Pickup landmark', req.pickupLandmark || '—'],
    ['Destination', req.destination || req.destinationHospital?.name || '—'],
    ['Hospital branch', req.destinationHospitalBranchName || '—'],
    ['Created', formatDateTimeShort(req.createdAt)],
    ['Last updated', formatDateTimeShort(req.updatedAt)],
    ['Completed', formatDateTimeShort(req.completedAt)],
    ['Cancelled', formatDateTimeShort(req.cancelledAt)],
    ['Cancellation reason', req.cancellationReason || '—'],
  ]
}

export function buildCrewSection(req: EmergencyRequest): [string, string][] {
  return [
    ['Dispatcher', empName(req.dispatcher)],
    ['Driver', empName(req.driver)],
    ['Nurse', empName(req.nurse)],
    ['Ambulance', req.ambulance?.ambulanceNumber || '—'],
    ['Ambulance plate', req.ambulance?.plateNumber || '—'],
  ]
}

export function buildIntakeSection(req: EmergencyRequest): [string, string][] {
  const callerRows = buildCallerReport(req)
  const mapped = callerRows.map((r) => [r.label, r.value] as [string, string])
  if (req.manualDispatchNotes?.trim()) {
    mapped.push(['Dispatch notes', req.manualDispatchNotes.trim()])
  }
  return mapped
}

export function buildTimingSection(req: EmergencyRequest): [string, string][] {
  return buildCaseTimingRows(req).map((row) => {
    const time = row.timestamp ? formatDateTimeShort(row.timestamp) : '—'
    const duration =
      row.durationMinutes != null && row.durationLabel
        ? `${row.durationLabel}: ${row.durationMinutes} min`
        : ''
    return [row.label, duration ? `${time} (${duration})` : time]
  })
}

export function buildTimelineTable(req: EmergencyRequest) {
  const events = buildCaseTimeline(req)
  return {
    title: 'Mission updates & timeline',
    columns: ['Date / time', 'Event', 'Details', 'Recorded by'],
    rows: events.map((ev) => [
      formatDateTimeShort(ev.at),
      ev.title,
      formatTimelineEventDetails(ev),
      ev.actor || '—',
    ]),
  }
}

export function buildCareRecordsTable(req: EmergencyRequest) {
  const records = req.patientCareRecords ?? []
  if (!records.length) return null
  return {
    title: 'Nurse clinical records',
    columns: ['Date / time', 'Nurse', 'BP', 'HR', 'SpO₂', 'Temp', 'Notes / treatment'],
    rows: records.map((r) => [
      formatDateTimeShort(r.createdAt),
      empName(r.nurse),
      r.bloodPressure || '—',
      r.heartRate ?? '—',
      r.oxygenSaturation ?? '—',
      r.temperature ?? '—',
      [r.treatmentGiven, r.medications, r.clinicalNotes].filter(Boolean).join(' · ') || '—',
    ]),
  }
}
