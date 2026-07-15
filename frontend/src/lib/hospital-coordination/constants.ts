export const AVAILABILITY_STATUSES = [
  'Available',
  'Limited Capacity',
  'Busy',
  'Full Capacity',
  'Offline',
] as const

export const REFUSAL_REASONS = [
  { value: 'NO_BEDS', label: 'No Available Beds' },
  { value: 'ICU_FULL', label: 'ICU Full' },
  { value: 'ER_FULL', label: 'Emergency Unit Full' },
  { value: 'EQUIPMENT_LIMIT', label: 'Equipment Limitation' },
  { value: 'STAFF_SHORTAGE', label: 'Staff Shortage' },
  { value: 'HOSPITAL_CLOSED', label: 'Hospital Closed' },
  { value: 'OTHER', label: 'Other' },
] as const

export const HOSPITAL_TYPES = [
  'Government Hospital',
  'Private Hospital',
  'Military Hospital',
  'Teaching Hospital',
  'NGO Hospital',
] as const

export type CoordinationView =
  | 'all-hospitals'
  | 'accepted'
  | 'refused'
  | 'analytics'

export type HospitalBranchRecord = {
  id: string
  name: string
  regionId: string
  districtId: string
  address: string
  email: string
  primaryPhone: string
  emergencyShortCode?: string
  emergencyHotline?: string
}

export function parseHospitalBranches(raw: unknown): HospitalBranchRecord[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((b) => b && typeof b === 'object' && 'id' in b && 'name' in b) as HospitalBranchRecord[]
}

export function refusalReasonLabel(code?: string | null) {
  const found = REFUSAL_REASONS.find((r) => r.value === code)
  if (found) return found.label
  if (!code) return 'Not specified'
  return code.replace(/_/g, ' ')
}
