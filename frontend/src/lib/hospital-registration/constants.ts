export const HOSPITAL_TYPES = [
  'General Hospital',
  'Women & Child Hospital',
  'Trauma Center',
  'Cardiac Center',
  'Clinic',
  'Specialized Hospital',
] as const

export const OWNERSHIP_TYPES = ['Public', 'Private', 'NGO', 'Military'] as const

export const CREATE_OPERATIONAL_STATUSES = ['Active', 'Inactive'] as const

export const COMMON_EMERGENCY_SHORT_CODES = ['999', '112', '997', '911'] as const

export type HospitalBranchForm = {
  id: string
  name: string
  regionId: string
  districtId: string
  address: string
  email: string
  primaryPhone: string
  emergencyShortCode: string
  emergencyHotline: string
}

export function emptyBranch(): HospitalBranchForm {
  return {
    id: crypto.randomUUID(),
    name: '',
    regionId: '',
    districtId: '',
    address: '',
    email: '',
    primaryPhone: '',
    emergencyShortCode: '999',
    emergencyHotline: '',
  }
}

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
  operationalStatus: string
  branches: HospitalBranchForm[]
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
  operationalStatus: 'Active',
  branches: [emptyBranch()],
}

const PHONE_RE = /^[+]?[\d\s\-()]{7,20}$/
const SHORT_CODE_RE = /^\d{2,5}$/
const HOTLINE_RE = /^[+]?[\d\s\-()]{3,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateBranch(branch: HospitalBranchForm, index: number, errors: Record<string, string>) {
  const p = `branch_${index}_`
  if (!branch.name.trim()) errors[`${p}name`] = 'Branch name is required'
  if (!branch.regionId) errors[`${p}regionId`] = 'Region is required'
  if (!branch.districtId) errors[`${p}districtId`] = 'District is required'
  if (!branch.address.trim()) errors[`${p}address`] = 'Address is required'
  if (!branch.email.trim()) errors[`${p}email`] = 'Email is required'
  else if (!EMAIL_RE.test(branch.email.trim())) errors[`${p}email`] = 'Invalid email'
  if (!branch.primaryPhone.trim()) errors[`${p}primaryPhone`] = 'Phone is required'
  else if (!PHONE_RE.test(branch.primaryPhone.trim())) errors[`${p}primaryPhone`] = 'Invalid phone'
  const hasShort = branch.emergencyShortCode.trim().length > 0
  const hasHotline = branch.emergencyHotline.trim().length > 0
  if (!hasShort && !hasHotline) errors[`${p}emergencyShortCode`] = 'Short code or hotline required'
  if (hasShort && !SHORT_CODE_RE.test(branch.emergencyShortCode.trim())) {
    errors[`${p}emergencyShortCode`] = 'Short code must be 2–5 digits'
  }
  if (hasHotline && !HOTLINE_RE.test(branch.emergencyHotline.trim())) {
    errors[`${p}emergencyHotline`] = 'Invalid hotline'
  }
}

export function validateCreateHospitalForm(data: CreateHospitalFormData): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!data.name.trim()) errors.name = 'Hospital name is required'
  if (!data.hospitalType) errors.hospitalType = 'Hospital type is required'
  if (!data.ownershipType) errors.ownershipType = 'Ownership type is required'
  if (!data.regionId) errors.regionId = 'Region is required'
  if (!data.districtId) errors.districtId = 'District is required'
  if (!data.address.trim()) errors.address = 'Head office address is required'
  if (!data.contactPersonName.trim()) errors.contactPersonName = 'Contact person is required'
  if (!data.contactPersonRole.trim()) errors.contactPersonRole = 'Contact role is required'
  if (!data.primaryPhone.trim()) errors.primaryPhone = 'Primary phone is required'
  else if (!PHONE_RE.test(data.primaryPhone.trim())) errors.primaryPhone = 'Invalid phone'
  if (data.secondaryPhone.trim() && !PHONE_RE.test(data.secondaryPhone.trim())) {
    errors.secondaryPhone = 'Invalid phone'
  }
  const hasShort = data.emergencyShortCode.trim().length > 0
  const hasHotline = data.emergencyHotline.trim().length > 0
  if (!hasShort && !hasHotline) errors.emergencyShortCode = 'Short code or hotline required'
  if (hasShort && !SHORT_CODE_RE.test(data.emergencyShortCode.trim())) {
    errors.emergencyShortCode = 'Short code must be 2–5 digits'
  }
  if (hasHotline && !HOTLINE_RE.test(data.emergencyHotline.trim())) {
    errors.emergencyHotline = 'Invalid hotline'
  }
  if (!data.email.trim()) errors.email = 'Email is required'
  else if (!EMAIL_RE.test(data.email.trim())) errors.email = 'Invalid email'

  if (!data.branches.length) errors.branches = 'Add at least one branch'
  data.branches.forEach((b, i) => validateBranch(b, i, errors))

  return errors
}
