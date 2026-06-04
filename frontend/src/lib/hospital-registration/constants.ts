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

export const MEDICAL_CAPABILITIES = [
  'General Care',
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
  emergencyHotline: string
  email: string
  acceptEmergencyCases: boolean
  medicalCapabilities: string[]
  operationalStatus: string
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
  emergencyHotline: '',
  email: '',
  acceptEmergencyCases: false,
  medicalCapabilities: [],
  operationalStatus: 'Active',
}

const PHONE_RE = /^\+?[\d\s\-()]{7,20}$/
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
  if (!data.emergencyHotline.trim()) errors.emergencyHotline = 'Emergency hotline is required'
  else if (!PHONE_RE.test(data.emergencyHotline.trim())) errors.emergencyHotline = 'Enter a valid hotline number'
  if (data.email.trim() && !EMAIL_RE.test(data.email.trim())) errors.email = 'Enter a valid email address'
  if (data.medicalCapabilities.length === 0) {
    errors.medicalCapabilities = 'Select at least one medical capability'
  }

  return errors
}
