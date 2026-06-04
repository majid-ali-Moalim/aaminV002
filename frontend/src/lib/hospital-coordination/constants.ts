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
  | 'availability'
  | 'incoming'
  | 'handover'
  | 'accepted'
  | 'refused'
  | 'analytics'
