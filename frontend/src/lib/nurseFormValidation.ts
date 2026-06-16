import {
  calculateAge,
  formatDateInput,
  isValidPersonName,
  isValidSomaliaPhone,
  normalizePhoneDigits,
  validateProfilePhotoFile,
} from '@/lib/driverFormValidation'
import { Gender } from '@/types'

export const MIN_NURSE_AGE = 21
export const MAX_NURSE_AGE = 65
export const MIN_PASSWORD_LENGTH = 8

export type NurseFormStep = 'personal' | 'location' | 'credentials' | 'account'

export type NurseFormValues = {
  profilePhoto: string
  firstName: string
  middleName: string
  lastName: string
  gender: string
  dateOfBirth: string
  phone: string
  alternatePhone: string
  nationalId: string
  address: string
  regionId: string
  districtId: string
  stationId: string
  emergencyContactName: string
  emergencyPhone: string
  relationship: string
  employeeCode: string
  departmentId: string
  employmentType: string
  joinDate: string
  shiftStatus: string
  assignedAmbulanceId: string
  licenseNumber: string
  licenseExpiryDate: string
  qualification: string
  specialization: string
  yearsOfExperience: string
  bloodGroup: string
  emergencyCareTrained: boolean
  certificationUpload: string
  email: string
  username: string
  password: string
  confirmPassword: string
  accountActive: boolean
  notes: string
}

export type NurseFormErrors = Partial<Record<keyof NurseFormValues, string>>

export type NurseFormContext = {
  departmentIds?: string[]
  qualificationIds?: string[]
  specializationIds?: string[]
  employmentTypeIds?: string[]
}
const NURSE_CODE_PATTERN = /^NUR-\d{3,}$/i
const ALLOWED_GENDERS = [Gender.MALE, Gender.FEMALE] as const
const NATIONAL_ID_PATTERN = /^[A-Za-z0-9-]{5,20}$/
const LICENSE_PATTERN = /^[A-Za-z0-9/-]{5,25}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/
const RELATIONSHIP_PATTERN = /^[\p{L}\s'-]{2,30}$/u

const STEP_FIELD_ORDER: Record<NurseFormStep, (keyof NurseFormValues)[]> = {
  personal: [
    'firstName',
    'middleName',
    'lastName',
    'gender',
    'dateOfBirth',
    'nationalId',
    'phone',
    'alternatePhone',
  ],
  location: [
    'address',
    'regionId',
    'districtId',
    'stationId',
    'employeeCode',
    'departmentId',
    'employmentType',
    'joinDate',
    'emergencyContactName',
    'relationship',
    'emergencyPhone',
  ],
  credentials: [
    'qualification',
    'specialization',
    'licenseNumber',
    'licenseExpiryDate',
    'yearsOfExperience',
    'notes',
  ],
  account: ['email', 'username', 'password', 'confirmPassword'],
}

function setError(errors: NurseFormErrors, field: keyof NurseFormValues, message: string) {
  if (!errors[field]) errors[field] = message
}

function parseDateOnly(value: string): Date | null {
  if (!value) return null
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function getNurseAgeLimits(referenceDate = new Date()) {
  const ref = startOfDay(referenceDate)
  const maxDob = new Date(ref)
  maxDob.setFullYear(maxDob.getFullYear() - MIN_NURSE_AGE)
  const minDob = new Date(ref)
  minDob.setFullYear(minDob.getFullYear() - MAX_NURSE_AGE)
  return { minDob: formatDateInput(minDob), maxDob: formatDateInput(maxDob) }
}

export function getMinJoinDate(dateOfBirth: string): string | undefined {
  const dob = parseDateOnly(dateOfBirth)
  if (!dob) return undefined
  const minJoin = new Date(dob)
  minJoin.setFullYear(minJoin.getFullYear() + MIN_NURSE_AGE)
  return formatDateInput(minJoin)
}

export { validateProfilePhotoFile, formatDateInput, normalizePhoneDigits }

function validatePersonal(form: NurseFormValues, errors: NurseFormErrors) {
  if (!isValidPersonName(form.firstName)) {
    setError(errors, 'firstName', 'Enter a valid first name (2–50 letters)')
  }
  if (form.middleName.trim() && !isValidPersonName(form.middleName, { required: false })) {
    setError(errors, 'middleName', 'Middle name must contain letters only')
  }
  if (!isValidPersonName(form.lastName)) {
    setError(errors, 'lastName', 'Enter a valid last name (2–50 letters)')
  }
  if (!form.gender) {
    setError(errors, 'gender', 'Gender is required')
  } else if (!ALLOWED_GENDERS.includes(form.gender as (typeof ALLOWED_GENDERS)[number])) {
    setError(errors, 'gender', 'Select Male or Female')
  }

  if (!form.dateOfBirth) {
    setError(errors, 'dateOfBirth', 'Date of birth is required')
  } else {
    const dob = parseDateOnly(form.dateOfBirth)
    const today = startOfDay(new Date())
    if (!dob) {
      setError(errors, 'dateOfBirth', 'Invalid date of birth')
    } else if (dob > today) {
      setError(errors, 'dateOfBirth', 'Date of birth cannot be in the future')
    } else {
      const age = calculateAge(form.dateOfBirth)
      if (age !== null && age < MIN_NURSE_AGE) {
        setError(errors, 'dateOfBirth', `Nurse must be at least ${MIN_NURSE_AGE} years old`)
      } else if (age !== null && age > MAX_NURSE_AGE) {
        setError(errors, 'dateOfBirth', `Nurse cannot be older than ${MAX_NURSE_AGE} years`)
      }
    }
  }

  const nationalId = form.nationalId.trim()
  if (!nationalId) {
    setError(errors, 'nationalId', 'National ID is required')
  } else if (!NATIONAL_ID_PATTERN.test(nationalId)) {
    setError(errors, 'nationalId', 'National ID must be 5–20 letters or numbers')
  }

  if (!form.phone.trim()) {
    setError(errors, 'phone', 'Phone number is required')
  } else if (!isValidSomaliaPhone(form.phone)) {
    setError(errors, 'phone', 'Enter a valid Somalia mobile (9 digits, starts with 6 or 7)')
  } else if (normalizePhoneDigits(form.phone).length !== 9) {
    setError(errors, 'phone', 'Phone number must be exactly 9 digits')
  }

  if (form.alternatePhone.trim()) {
    if (!isValidSomaliaPhone(form.alternatePhone)) {
      setError(errors, 'alternatePhone', 'Enter a valid alternate mobile number')
    } else if (normalizePhoneDigits(form.alternatePhone).length !== 9) {
      setError(errors, 'alternatePhone', 'Alternate phone must be exactly 9 digits')
    } else if (normalizePhoneDigits(form.alternatePhone) === normalizePhoneDigits(form.phone)) {
      setError(errors, 'alternatePhone', 'Alternate phone must differ from primary phone')
    }
  }
}

function validateLocation(form: NurseFormValues, errors: NurseFormErrors, ctx?: NurseFormContext) {
  const address = form.address.trim()
  if (!address) {
    setError(errors, 'address', 'Address is required')
  } else if (address.length < 2) {
    setError(errors, 'address', 'Address must be at least 2 characters')
  } else if (address.length > 200) {
    setError(errors, 'address', 'Address cannot exceed 200 characters')
  }

  if (!form.regionId) setError(errors, 'regionId', 'Region is required')
  if (!form.districtId) setError(errors, 'districtId', 'District is required')
  if (!form.stationId) setError(errors, 'stationId', 'Assigned station is required')
  if (!form.departmentId) {
    setError(errors, 'departmentId', 'Department is required')
  } else if (ctx?.departmentIds?.length && !ctx.departmentIds.includes(form.departmentId)) {
    setError(errors, 'departmentId', 'Select a valid department from System Setup')
  }

  const code = form.employeeCode.trim()
  if (!code) {
    setError(errors, 'employeeCode', 'Employee code is required')
  } else if (!NURSE_CODE_PATTERN.test(code)) {
    setError(errors, 'employeeCode', 'Code must match format NUR-001')
  }

  if (!form.employmentType.trim()) {
    setError(errors, 'employmentType', 'Employment type is required')
  } else if (ctx?.employmentTypeIds?.length && !ctx.employmentTypeIds.includes(form.employmentType)) {
    setError(errors, 'employmentType', 'Select a valid employment type')
  }

  if (!form.joinDate) {
    setError(errors, 'joinDate', 'Join date is required')
  } else {
    const join = parseDateOnly(form.joinDate)
    const today = startOfDay(new Date())
    if (!join) {
      setError(errors, 'joinDate', 'Invalid join date')
    } else if (join > today) {
      setError(errors, 'joinDate', 'Join date cannot be in the future')
    } else if (form.dateOfBirth) {
      const minJoin = getMinJoinDate(form.dateOfBirth)
      if (minJoin && form.joinDate < minJoin) {
        setError(errors, 'joinDate', `Join date must be on or after nurse turns ${MIN_NURSE_AGE}`)
      }
    }
  }

  if (!isValidPersonName(form.emergencyContactName)) {
    setError(errors, 'emergencyContactName', 'Enter a valid emergency contact name')
  }

  const relationship = form.relationship.trim()
  if (!relationship) {
    setError(errors, 'relationship', 'Relationship is required')
  } else if (relationship.length < 2) {
    setError(errors, 'relationship', 'Relationship must be at least 2 characters')
  } else if (!RELATIONSHIP_PATTERN.test(relationship)) {
    setError(errors, 'relationship', 'Relationship must contain letters only')
  }

  if (!form.emergencyPhone.trim()) {
    setError(errors, 'emergencyPhone', 'Emergency contact phone is required')
  } else if (!isValidSomaliaPhone(form.emergencyPhone)) {
    setError(errors, 'emergencyPhone', 'Enter a valid emergency contact mobile')
  } else if (normalizePhoneDigits(form.emergencyPhone).length !== 9) {
    setError(errors, 'emergencyPhone', 'Emergency phone must be exactly 9 digits')
  } else {
    const emergencyDigits = normalizePhoneDigits(form.emergencyPhone)
    if (emergencyDigits === normalizePhoneDigits(form.phone)) {
      setError(errors, 'emergencyPhone', 'Emergency phone must differ from nurse phone')
    }
    if (form.alternatePhone.trim() && emergencyDigits === normalizePhoneDigits(form.alternatePhone)) {
      setError(errors, 'emergencyPhone', 'Emergency phone must differ from alternate phone')
    }
  }

  const fullName = `${form.firstName} ${form.lastName}`.trim().toLowerCase()
  if (fullName && form.emergencyContactName.trim().toLowerCase() === fullName) {
    setError(errors, 'emergencyContactName', 'Emergency contact cannot be the nurse themselves')
  }
}

function validateCredentials(form: NurseFormValues, errors: NurseFormErrors, ctx?: NurseFormContext) {
  if (!form.qualification.trim()) {
    setError(errors, 'qualification', 'Qualification is required')
  } else if (ctx?.qualificationIds?.length && !ctx.qualificationIds.includes(form.qualification)) {
    setError(errors, 'qualification', 'Select a valid qualification')
  }
  if (!form.specialization.trim()) {
    setError(errors, 'specialization', 'Specialization is required')
  } else if (ctx?.specializationIds?.length && !ctx.specializationIds.includes(form.specialization)) {
    setError(errors, 'specialization', 'Select a valid specialization')
  }

  const license = form.licenseNumber.trim()
  if (!license) {
    setError(errors, 'licenseNumber', 'Nursing license / registration number is required')
  } else if (!LICENSE_PATTERN.test(license)) {
    setError(errors, 'licenseNumber', 'License number must be 5–25 characters')
  }

  if (!form.licenseExpiryDate) {
    setError(errors, 'licenseExpiryDate', 'License expiry date is required')
  } else {
    const expiry = parseDateOnly(form.licenseExpiryDate)
    const today = startOfDay(new Date())
    if (!expiry) {
      setError(errors, 'licenseExpiryDate', 'Invalid expiry date')
    } else if (expiry <= today) {
      setError(errors, 'licenseExpiryDate', 'License must not be expired')
    }
  }

  if (form.yearsOfExperience.trim()) {
    const years = Number(form.yearsOfExperience)
    if (!Number.isFinite(years) || years < 0) {
      setError(errors, 'yearsOfExperience', 'Experience cannot be negative')
    } else if (years > 50) {
      setError(errors, 'yearsOfExperience', 'Experience cannot exceed 50 years')
    } else if (form.dateOfBirth) {
      const age = calculateAge(form.dateOfBirth)
      const maxExp = age !== null ? Math.max(0, age - MIN_NURSE_AGE) : 50
      if (years > maxExp) {
        setError(errors, 'yearsOfExperience', `Experience cannot exceed ${maxExp} years for this age`)
      }
    }
  }

  if (form.notes.trim().length > 500) {
    setError(errors, 'notes', 'Notes cannot exceed 500 characters')
  }
}

function validateAccount(form: NurseFormValues, errors: NurseFormErrors) {
  const email = form.email.trim()
  if (!email) {
    setError(errors, 'email', 'Email is required')
  } else if (!EMAIL_PATTERN.test(email)) {
    setError(errors, 'email', 'Enter a valid email address')
  }

  const username = form.username.trim()
  if (!username) {
    setError(errors, 'username', 'Username is required')
  } else if (!USERNAME_PATTERN.test(username)) {
    setError(errors, 'username', 'Username: 3–30 letters, numbers, or underscore')
  }

  if (!form.password) {
    setError(errors, 'password', 'Password is required')
  } else if (form.password.length < MIN_PASSWORD_LENGTH) {
    setError(errors, 'password', `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  } else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
    setError(errors, 'password', 'Password must include letters and numbers')
  }

  if (!form.confirmPassword) {
    setError(errors, 'confirmPassword', 'Confirm your password')
  } else if (form.password !== form.confirmPassword) {
    setError(errors, 'confirmPassword', 'Passwords do not match')
  }
}

function firstErrorInStep(
  step: NurseFormStep,
  errors: NurseFormErrors
): { field: keyof NurseFormValues | null; message: string | null } {
  for (const field of STEP_FIELD_ORDER[step]) {
    if (errors[field]) {
      return { field, message: errors[field] ?? null }
    }
  }
  return { field: null, message: null }
}

export function validateNurseFormStep(
  step: NurseFormStep,
  form: NurseFormValues,
  ctx?: NurseFormContext
): { valid: boolean; errors: NurseFormErrors; firstMessage: string | null } {
  const errors: NurseFormErrors = {}
  if (step === 'personal') validatePersonal(form, errors)
  if (step === 'location') validateLocation(form, errors, ctx)
  if (step === 'credentials') validateCredentials(form, errors, ctx)
  if (step === 'account') validateAccount(form, errors)
  const { message } = firstErrorInStep(step, errors)
  return { valid: Object.keys(errors).length === 0, errors, firstMessage: message }
}

export function validateNurseForm(
  form: NurseFormValues,
  ctx?: NurseFormContext
): {
  valid: boolean
  errors: NurseFormErrors
  firstMessage: string | null
  firstStep: NurseFormStep | null
} {
  const steps: NurseFormStep[] = ['personal', 'location', 'credentials', 'account']
  const merged: NurseFormErrors = {}

  for (const step of steps) {
    Object.assign(merged, validateNurseFormStep(step, form, ctx).errors)
  }

  for (const step of steps) {
    const { field, message } = firstErrorInStep(step, merged)
    if (field && message) {
      return { valid: false, errors: merged, firstMessage: message, firstStep: step }
    }
  }

  return { valid: true, errors: merged, firstMessage: null, firstStep: null }
}

export function getStepFieldErrors(step: NurseFormStep, errors: NurseFormErrors): NurseFormErrors {
  const stepErrors: NurseFormErrors = {}
  for (const field of STEP_FIELD_ORDER[step]) {
    if (errors[field]) stepErrors[field] = errors[field]
  }
  return stepErrors
}
