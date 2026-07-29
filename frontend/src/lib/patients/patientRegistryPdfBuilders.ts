import type { EmergencyRequest, Patient } from '@/types'
import {
  formatBloodType,
  formatDateShort,
  formatDateTimeShort,
  formatGender,
  formatPatientAge,
} from '@/lib/patients/patientDisplay'

function labelEnum(value?: string | null): string {
  if (!value) return '—'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function parseRequestType(notes?: string | null, requestSource?: string | null): string {
  if (notes?.includes('Request Type: Referral') || requestSource === 'REFERRAL') return 'Referral'
  if (notes?.includes('Request Type: Non-Emergency')) return 'Non-Emergency'
  if (notes?.includes('Request Type: Emergency')) return 'Emergency'
  return 'Emergency'
}

export type PatientRegistryPdfFilters = {
  search?: string
  status?: 'all' | 'active' | 'inactive'
}

export function buildPatientRegistryFilterScope(
  filters: PatientRegistryPdfFilters,
  patientCount: number,
): { scopeNote: string; filterDescription: string; isFiltered: boolean } {
  const parts: string[] = []
  if (filters.status === 'active') parts.push('Status: Active only')
  else if (filters.status === 'inactive') parts.push('Status: Inactive only')
  else parts.push('Status: All patients')

  if (filters.search?.trim()) parts.push(`Search: "${filters.search.trim()}"`)

  const isFiltered = Boolean(filters.search?.trim() || (filters.status && filters.status !== 'all'))

  const filterDescription = parts.join(' · ')
  const scopeNote = isFiltered
    ? `This report contains ${patientCount} patient(s) matching your filters (${filterDescription}). Registry overview and detailed profiles are included for each listed patient.`
    : `This report contains ${patientCount} patient(s) from the master registry with demographics, medical notes, and case history summaries.`

  return { scopeNote, filterDescription, isFiltered }
}

export function buildRegistrySummaryStats(patients: Patient[]) {
  const withCases = patients.filter((p) => (p.totalEmergencies ?? 0) > 0).length
  const active = patients.filter((p) => p.isActive).length
  const inactive = patients.length - active
  return [
    { label: 'Patients in report', value: patients.length },
    { label: 'With cases', value: withCases },
    { label: 'Active', value: active },
    { label: 'Inactive', value: inactive },
  ]
}

export function buildRegistryOverviewTable(patients: Patient[]) {
  return {
    title: 'Patient registry overview',
    columns: [
      'Patient ID',
      'Full Name',
      'Phone',
      'Gender',
      'Age',
      'Blood Group',
      'Total Cases',
      'Last Emergency',
      'Status',
    ],
    rows: patients.map((p) => [
      p.patientCode,
      p.fullName,
      p.phone || '—',
      formatGender(p.gender),
      formatPatientAge(p),
      formatBloodType(p.bloodType),
      String(p.totalEmergencies ?? 0),
      formatDateShort(p.lastEmergencyDate),
      p.isActive ? 'Active' : 'Inactive',
    ]),
  }
}

export function buildPatientProfileSection(patient: Patient): [string, string][] {
  return [
    ['Full name', patient.fullName],
    ['Patient ID', patient.patientCode],
    ['Phone', patient.phone || '—'],
    ['Email', patient.email || '—'],
    ['Gender', formatGender(patient.gender)],
    ['Age', formatPatientAge(patient)],
    ['Date of birth', formatDateShort(patient.dateOfBirth)],
    ['Blood group', formatBloodType(patient.bloodType)],
    ['Nationality', labelEnum(patient.nationalityType)],
    ['Country', patient.country || '—'],
    ['Marital status', labelEnum(patient.maritalStatus)],
    ['Address', patient.address || '—'],
    ['Region', patient.region?.name || '—'],
    ['District', patient.district?.name || '—'],
    ['Known conditions', patient.conditions || '—'],
    ['Allergies', patient.allergies || '—'],
    ['Insurance provider', patient.insuranceProvider || '—'],
    ['Registry status', patient.isActive ? 'Active' : 'Inactive'],
    ['Registered', formatDateShort(patient.createdAt)],
    ['Last updated', formatDateShort(patient.updatedAt)],
    ['Total cases', String(patient.totalEmergencies ?? 0)],
    ['Last emergency', formatDateShort(patient.lastEmergencyDate)],
    ['Last ambulance', patient.lastAmbulanceNumber || '—'],
    ['Last hospital', patient.lastHospitalName || '—'],
  ]
}

export function buildPatientCaseHistoryTable(
  patientId: string,
  cases: EmergencyRequest[],
  title = 'Case history',
) {
  const patientCases = cases
    .filter((c) => c.patientId === patientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (!patientCases.length) return null

  return {
    title,
    columns: [
      'Case #',
      'Type',
      'Priority',
      'Status',
      'Ambulance',
      'Created',
      'Completed / closed',
    ],
    rows: patientCases.map((req) => [
      req.trackingCode,
      parseRequestType(req.notes, req.requestSource),
      req.priority,
      req.status.replace(/_/g, ' '),
      req.ambulance?.ambulanceNumber || '—',
      formatDateTimeShort(req.createdAt),
      formatDateTimeShort(req.completedAt || req.cancelledAt),
    ]),
  }
}
