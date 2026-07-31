export const MANUAL_HOSPITAL_TYPES = [
  'General Hospital',
  'Women & Child Hospital',
  'Trauma Center',
  'Cardiac Center',
  'Clinic',
  'Specialized Hospital',
] as const

export type ManualAssignHospitalForm = {
  name: string
  hospitalType: string
  regionId: string
  districtId: string
  address: string
  branchName: string
  branchAddress: string
  primaryPhone: string
  emergencyHotline: string
  emergencyShortCode: string
  contactPersonName: string
  contactPersonRole: string
  email: string
  receivingStaffName: string
  notes: string
}

export type ManualAssignHospitalFieldErrors = Partial<Record<keyof ManualAssignHospitalForm, string>>

export const EMPTY_MANUAL_ASSIGN_HOSPITAL: ManualAssignHospitalForm = {
  name: '',
  hospitalType: 'General Hospital',
  regionId: '',
  districtId: '',
  address: '',
  branchName: '',
  branchAddress: '',
  primaryPhone: '',
  emergencyHotline: '',
  emergencyShortCode: '',
  contactPersonName: '',
  contactPersonRole: '',
  email: '',
  receivingStaffName: '',
  notes: '',
}

const PHONE_RE = /^\+?[\d\s\-()]{7,20}$/
const HOTLINE_RE = /^[+\d\s\-()]{3,20}$/
const SHORT_CODE_RE = /^\d{2,5}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateManualAssignHospitalForm(
  form: ManualAssignHospitalForm,
): ManualAssignHospitalFieldErrors {
  const errors: ManualAssignHospitalFieldErrors = {}

  if (!form.name.trim()) {
    errors.name = 'Place / hospital name is required'
  } else if (form.name.trim().length > 120) {
    errors.name = 'Name must be 120 characters or less'
  }

  if (!form.regionId) errors.regionId = 'Select a region'
  if (!form.districtId) errors.districtId = 'Select a district'

  if (!form.address.trim()) {
    errors.address = 'Location / address is required'
  } else if (form.address.trim().length > 300) {
    errors.address = 'Address must be 300 characters or less'
  }

  if (form.primaryPhone.trim() && !PHONE_RE.test(form.primaryPhone.trim())) {
    errors.primaryPhone = 'Enter a valid phone number'
  }

  if (form.emergencyHotline.trim() && !HOTLINE_RE.test(form.emergencyHotline.trim())) {
    errors.emergencyHotline = 'Enter a valid emergency hotline'
  }

  if (form.emergencyShortCode.trim() && !SHORT_CODE_RE.test(form.emergencyShortCode.trim())) {
    errors.emergencyShortCode = 'Short code must be 2–5 digits'
  }

  if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
    errors.email = 'Enter a valid email address'
  }

  if (form.branchName.trim().length > 120) {
    errors.branchName = 'Branch name must be 120 characters or less'
  }

  if (form.branchAddress.trim().length > 300) {
    errors.branchAddress = 'Branch address must be 300 characters or less'
  }

  return errors
}

export function hasManualAssignHospitalErrors(errors: ManualAssignHospitalFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function firstManualAssignHospitalError(
  errors: ManualAssignHospitalFieldErrors,
): string | undefined {
  return Object.values(errors)[0]
}
