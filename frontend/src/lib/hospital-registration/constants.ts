export const HOSPITAL_TYPES = [
  'General Hospital',
  'Women & Child Hospital',
  'Trauma Center',
  'Cardiac Center',
  'Clinic',
  'Specialized Hospital',
] as const

export const OWNERSHIP_TYPES = ['Public', 'Private', 'NGO', 'Military'] as const

export const OPERATIONAL_STATUSES = ['Active', 'Inactive', 'Maintenance'] as const

/** Shown on admin create-hospital form (Maintenance excluded). */
export const CREATE_OPERATIONAL_STATUSES = ['Active', 'Inactive'] as const

export const CAPACITY_STATUSES = [
  'Available',
  'Limited Capacity',
  'Full Capacity',
  'Emergency Only',
  'Temporarily Unavailable',
  'Under Maintenance',
] as const

export const HOSPITAL_STAFF_ROLES = [
  'Hospital Coordinator',
  'Emergency Coordinator',
  'Hospital Manager',
] as const

export const ACCOUNT_STATUSES = ['Active', 'Suspended', 'Pending Activation'] as const

export const COMMON_EMERGENCY_SHORT_CODES = ['999', '112', '997', '911'] as const

export const MEDICAL_CAPABILITIES = [
  'General Care',
  'Emergency Department',
  'Trauma Care',
  'Surgery Support',
  'Women & Child Care',
  'Maternity Care',
  'Pediatric Care',
  'Cardiology Support',
  'Neurology Support',
  'ICU Capability',
  'Burn Treatment',
  'Blood Transfusion',
  'Orthopedic Care',
  'Dialysis Services',
  'Laboratory Services',
  'Radiology Services',
] as const

export type CreateHospitalFormData = {
  name: string
  hospitalType: string
  ownershipType: string
  regionId: string
  districtId: string
  address: string
  contactPersonName: string
  contactPersonRole: string
  primaryPhone: string
  secondaryPhone: string
  emergencyShortCode: string
  emergencyHotline: string
  email: string
  website: string
  acceptEmergencyCases: boolean
  medicalCapabilities: string[]
  beds: string
  icuTotalBeds: string
  emergencyBeds: string
  operatingRooms: string
  ambulanceReceptionCapacity: string
  capacityStatus: string
  operationalStatus: string
  available24_7: boolean
  acceptAmbulanceTransfers: boolean
  acceptWalkInPatients: boolean
  accountUsername: string
  accountEmail: string
  accountPassword: string
  accountPasswordConfirm: string
  hospitalRole: string
  accountStatus: string
  forcePasswordChange: boolean
}

export const INITIAL_HOSPITAL_FORM: CreateHospitalFormData = {
  name: '',
  hospitalType: '',
  ownershipType: '',
  regionId: '',
  districtId: '',
  address: '',
  contactPersonName: '',
  contactPersonRole: '',
  primaryPhone: '',
  secondaryPhone: '',
  emergencyShortCode: '999',
  emergencyHotline: '',
  email: '',
  website: '',
  acceptEmergencyCases: true,
  medicalCapabilities: [],
  beds: '0',
  icuTotalBeds: '0',
  emergencyBeds: '0',
  operatingRooms: '0',
  ambulanceReceptionCapacity: '0',
  capacityStatus: 'Available',
  operationalStatus: 'Active',
  available24_7: true,
  acceptAmbulanceTransfers: true,
  acceptWalkInPatients: true,
  accountUsername: '',
  accountEmail: '',
  accountPassword: '',
  accountPasswordConfirm: '',
  hospitalRole: 'Hospital Coordinator',
  accountStatus: 'Active',
  forcePasswordChange: true,
}

const PHONE_RE = /^[+]?[\d\s\-()]{7,20}$/
const SHORT_CODE_RE = /^\d{2,5}$/
const HOTLINE_RE = /^[+]?[\d\s\-()]{3,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateCreateHospitalForm(data: CreateHospitalFormData): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!data.name.trim()) errors.name = 'Hospital name is required'
  if (!data.hospitalType) errors.hospitalType = 'Hospital type is required'
  if (!data.ownershipType) errors.ownershipType = 'Ownership type is required'
  if (!data.regionId) errors.regionId = 'Region is required'
  if (!data.districtId) errors.districtId = 'District is required'
  if (!data.address.trim()) errors.address = 'Full address is required'
  if (!data.contactPersonName.trim()) errors.contactPersonName = 'Contact person name is required'
  if (!data.contactPersonRole.trim()) errors.contactPersonRole = 'Contact person role is required'
  if (!data.primaryPhone.trim()) errors.primaryPhone = 'Primary phone is required'
  else if (!PHONE_RE.test(data.primaryPhone.trim())) errors.primaryPhone = 'Enter a valid phone number'
  if (data.secondaryPhone.trim() && !PHONE_RE.test(data.secondaryPhone.trim())) {
    errors.secondaryPhone = 'Enter a valid phone number'
  }
  const hasShort = data.emergencyShortCode.trim().length > 0
  const hasHotline = data.emergencyHotline.trim().length > 0
  if (!hasShort && !hasHotline) {
    errors.emergencyShortCode = 'Enter a short code (e.g. 999) or full hotline'
  }
  if (hasShort && !SHORT_CODE_RE.test(data.emergencyShortCode.trim())) {
    errors.emergencyShortCode = 'Short code must be 2–5 digits (e.g. 999, 112)'
  }
  if (hasHotline && !HOTLINE_RE.test(data.emergencyHotline.trim())) {
    errors.emergencyHotline = 'Enter a valid hotline number'
  }
  if (!data.email.trim()) errors.email = 'Email is required'
  else if (!EMAIL_RE.test(data.email.trim())) errors.email = 'Enter a valid email address'
  if (data.medicalCapabilities.length === 0) {
    errors.medicalCapabilities = 'Select at least one medical capability'
  }
  if (!data.accountUsername.trim()) errors.accountUsername = 'Username is required'
  if (!data.accountEmail.trim()) errors.accountEmail = 'Login email is required'
  else if (!EMAIL_RE.test(data.accountEmail.trim())) errors.accountEmail = 'Enter a valid login email'
  if (!data.accountPassword || data.accountPassword.length < 8) {
    errors.accountPassword = 'Password must be at least 8 characters'
  }
  if (data.accountPassword !== data.accountPasswordConfirm) {
    errors.accountPasswordConfirm = 'Passwords do not match'
  }

  return errors
}
