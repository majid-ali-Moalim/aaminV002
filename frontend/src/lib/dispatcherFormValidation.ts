import {
  calculateAge,
  formatDateInput,
  isValidPersonName,
  isValidSomaliaPhone,
  normalizePhoneDigits,
  validateProfilePhotoFile,
  getMinJoinDate,
  MIN_PASSWORD_LENGTH,
} from '@/lib/driverFormValidation'
import { Gender } from '@/types'

export const MIN_DISPATCHER_AGE = 21
export const MAX_DISPATCHER_AGE = 65

export type DispatcherFormStep = 'personal' | 'location' | 'credentials' | 'account'

export type DispatcherFormValues = {
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
  areaZone: string
  stationId: string
  emergencyContactName: string
  emergencyPhone: string
  relationship: string
  employeeCode: string
  departmentId: string
  employmentType: string
  joinDate: string
  shiftStatus: string
  licenseNumber: string
  licenseExpiryDate: string
  qualification: string
  yearsOfExperience: string
  certificationUpload: string
  dispatchConsoleTrained: boolean
  email: string
  username: string
  password: string
  confirmPassword: string
  accountActive: boolean
  notes: string
}

export type DispatcherFormErrors = Partial<Record<keyof DispatcherFormValues, string>>

export type DispatcherFormContext = {
  departmentIds?: string[]
  employmentTypeIds?: string[]
  qualificationIds?: string[]
}

const DISPATCHER_CODE_PATTERN = /^DIS-\d{3,}$/i
const LICENSE_PATTERN = /^[A-Za-z0-9/-]{5,25}$/
const ALLOWED_GENDERS = [Gender.MALE, Gender.FEMALE] as const
const NATIONAL_ID_PATTERN = /^[A-Za-z0-9-]{5,20}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/

const STEP_FIELDS: Record<DispatcherFormStep, (keyof DispatcherFormValues)[]> = {
  personal: ['firstName', 'middleName', 'lastName', 'gender', 'dateOfBirth', 'nationalId', 'phone', 'alternatePhone'],
  location: [
    'address',
    'regionId',
    'districtId',
    'areaZone',
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
    'licenseNumber',
    'licenseExpiryDate',
    'qualification',
    'yearsOfExperience',
    'certificationUpload',
    'notes',
  ],
  account: ['email', 'username', 'password', 'confirmPassword'],
}

function parseDateOnly(value: string): Date | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function setError(errors: DispatcherFormErrors, field: keyof DispatcherFormValues, message: string) {
  if (!errors[field]) errors[field] = message
}

export { formatDateInput, validateProfilePhotoFile, getMinJoinDate }

export function getDispatcherAgeLimits(referenceDate = new Date()) {
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
  const maxDob = new Date(ref)
  maxDob.setFullYear(maxDob.getFullYear() - MIN_DISPATCHER_AGE)
  const minDob = new Date(ref)
  minDob.setFullYear(minDob.getFullYear() - MAX_DISPATCHER_AGE)
  return { minDob: formatDateInput(minDob), maxDob: formatDateInput(maxDob) }
}

function validatePersonal(form: DispatcherFormValues, errors: DispatcherFormErrors) {
  if (!isValidPersonName(form.firstName, { required: true })) {
    setError(errors, 'firstName', 'Enter a valid first name (2–50 letters)')
  }
  if (form.middleName.trim() && !isValidPersonName(form.middleName, { required: false })) {
    setError(errors, 'middleName', 'Middle name must be 2–50 letters')
  }
  if (!isValidPersonName(form.lastName, { required: true })) {
    setError(errors, 'lastName', 'Enter a valid last name (2–50 letters)')
  }
  if (!form.gender) setError(errors, 'gender', 'Gender is required')
  else if (!ALLOWED_GENDERS.includes(form.gender as (typeof ALLOWED_GENDERS)[number])) {
    setError(errors, 'gender', 'Select Male or Female')
  }
  if (!form.dateOfBirth) setError(errors, 'dateOfBirth', 'Date of birth is required')
  else {
    const age = calculateAge(form.dateOfBirth)
    if (age === null) setError(errors, 'dateOfBirth', 'Invalid date of birth')
    else if (age < MIN_DISPATCHER_AGE) setError(errors, 'dateOfBirth', `Dispatcher must be at least ${MIN_DISPATCHER_AGE}`)
    else if (age > MAX_DISPATCHER_AGE) setError(errors, 'dateOfBirth', `Age cannot exceed ${MAX_DISPATCHER_AGE}`)
  }
  const nationalId = form.nationalId.trim()
  if (!nationalId) setError(errors, 'nationalId', 'National ID is required')
  else if (!NATIONAL_ID_PATTERN.test(nationalId)) {
    setError(errors, 'nationalId', 'National ID must be 5–20 alphanumeric characters')
  }
  if (!form.phone.trim()) setError(errors, 'phone', 'Phone is required')
  else if (!isValidSomaliaPhone(form.phone)) setError(errors, 'phone', 'Enter a valid Somalia mobile (9 digits, starts with 6 or 7)')
  if (form.alternatePhone.trim()) {
    if (!isValidSomaliaPhone(form.alternatePhone)) setError(errors, 'alternatePhone', 'Enter a valid alternate mobile')
    else if (normalizePhoneDigits(form.alternatePhone) === normalizePhoneDigits(form.phone)) {
      setError(errors, 'alternatePhone', 'Alternate phone must differ from primary')
    }
  }
}

function validateLocation(form: DispatcherFormValues, errors: DispatcherFormErrors, ctx?: DispatcherFormContext) {
  if (!form.address.trim() || form.address.trim().length < 5) {
    setError(errors, 'address', 'Address must be at least 5 characters')
  }
  if (!form.regionId) setError(errors, 'regionId', 'Region is required')
  if (!form.districtId) setError(errors, 'districtId', 'District is required')
  const areaZone = form.areaZone.trim()
  if (areaZone.length > 100) setError(errors, 'areaZone', 'Area / zone cannot exceed 100 characters')
  else if (areaZone.length > 0 && areaZone.length < 2) setError(errors, 'areaZone', 'Area / zone must be at least 2 characters')
  if (!form.stationId) setError(errors, 'stationId', 'Dispatch station is required')
  const code = form.employeeCode.trim()
  if (!code) setError(errors, 'employeeCode', 'Employee code is required')
  else if (!DISPATCHER_CODE_PATTERN.test(code)) setError(errors, 'employeeCode', 'Use format DIS-001')
  if (!form.departmentId) setError(errors, 'departmentId', 'Department is required')
  else if (ctx?.departmentIds?.length && !ctx.departmentIds.includes(form.departmentId)) {
    setError(errors, 'departmentId', 'Select a valid department')
  }
  if (!form.employmentType) setError(errors, 'employmentType', 'Employment type is required')
  if (!form.joinDate) setError(errors, 'joinDate', 'Join date is required')
  if (form.emergencyContactName.trim() && form.emergencyContactName.trim().length < 2) {
    setError(errors, 'emergencyContactName', 'Contact name must be at least 2 characters')
  }
  if (form.emergencyPhone.trim() && !isValidSomaliaPhone(form.emergencyPhone)) {
    setError(errors, 'emergencyPhone', 'Enter a valid emergency mobile')
  }
}

function validateCredentials(form: DispatcherFormValues, errors: DispatcherFormErrors, ctx?: DispatcherFormContext) {
  const license = form.licenseNumber.trim()
  if (!license) {
    setError(errors, 'licenseNumber', 'Dispatch certification / training ID is required')
  } else if (!LICENSE_PATTERN.test(license)) {
    setError(errors, 'licenseNumber', 'Certification ID must be 5–25 characters')
  }

  if (!form.licenseExpiryDate) {
    setError(errors, 'licenseExpiryDate', 'Certificate expiry date is required')
  } else {
    const expiry = parseDateOnly(form.licenseExpiryDate)
    const today = startOfDay(new Date())
    if (!expiry) setError(errors, 'licenseExpiryDate', 'Invalid expiry date')
    else if (expiry <= today) setError(errors, 'licenseExpiryDate', 'Certificate must not be expired')
  }

  if (!form.qualification.trim()) {
    setError(errors, 'qualification', 'Qualification is required')
  } else if (ctx?.qualificationIds?.length && !ctx.qualificationIds.includes(form.qualification)) {
    setError(errors, 'qualification', 'Select a valid qualification')
  }

  if (!form.certificationUpload.trim()) {
    setError(errors, 'certificationUpload', 'Upload dispatch certification document (PDF, JPG, or PNG)')
  }

  if (form.yearsOfExperience.trim()) {
    const years = Number(form.yearsOfExperience)
    if (!Number.isFinite(years) || years < 0) {
      setError(errors, 'yearsOfExperience', 'Experience cannot be negative')
    } else if (years > 50) {
      setError(errors, 'yearsOfExperience', 'Experience cannot exceed 50 years')
    } else if (form.dateOfBirth) {
      const age = calculateAge(form.dateOfBirth)
      const maxExp = age !== null ? Math.max(0, age - MIN_DISPATCHER_AGE) : 50
      if (years > maxExp) {
        setError(errors, 'yearsOfExperience', `Experience cannot exceed ${maxExp} years for this age`)
      }
    }
  }

  if (form.notes.length > 500) setError(errors, 'notes', 'Notes cannot exceed 500 characters')
}

function validateAccount(form: DispatcherFormValues, errors: DispatcherFormErrors) {
  if (!form.email.trim()) setError(errors, 'email', 'Email is required')
  else if (!EMAIL_PATTERN.test(form.email.trim())) setError(errors, 'email', 'Enter a valid email')
  if (!form.username.trim()) setError(errors, 'username', 'Username is required')
  else if (!USERNAME_PATTERN.test(form.username.trim())) setError(errors, 'username', 'Username: 3–30 letters, numbers, underscore')
  if (!form.password) setError(errors, 'password', 'Password is required')
  else if (form.password.length < MIN_PASSWORD_LENGTH) {
    setError(errors, 'password', `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  }
  if (form.password !== form.confirmPassword) setError(errors, 'confirmPassword', 'Passwords do not match')
}

export function validateDispatcherFormStep(
  step: DispatcherFormStep,
  form: DispatcherFormValues,
  ctx?: DispatcherFormContext,
): { valid: boolean; errors: DispatcherFormErrors; firstMessage: string | null } {
  const errors: DispatcherFormErrors = {}
  if (step === 'personal') validatePersonal(form, errors)
  if (step === 'location') validateLocation(form, errors, ctx)
  if (step === 'credentials') validateCredentials(form, errors, ctx)
  if (step === 'account') validateAccount(form, errors)
  const firstMessage = Object.values(errors)[0] ?? null
  return { valid: Object.keys(errors).length === 0, errors, firstMessage }
}

export function validateDispatcherForm(form: DispatcherFormValues, ctx?: DispatcherFormContext) {
  const steps: DispatcherFormStep[] = ['personal', 'location', 'credentials', 'account']
  const merged: DispatcherFormErrors = {}
  let firstStep: DispatcherFormStep | null = null
  for (const step of steps) {
    const result = validateDispatcherFormStep(step, form, ctx)
    Object.assign(merged, result.errors)
    if (!firstStep && !result.valid) firstStep = step
  }
  const firstKey = Object.keys(merged)[0] as keyof DispatcherFormValues | undefined
  return {
    valid: Object.keys(merged).length === 0,
    errors: merged,
    firstMessage: firstKey ? merged[firstKey] ?? null : null,
    firstStep,
  }
}

export function getStepFieldErrors(step: DispatcherFormStep, errors: DispatcherFormErrors) {
  const next: DispatcherFormErrors = {}
  for (const key of STEP_FIELDS[step]) {
    if (errors[key]) next[key] = errors[key]
  }
  return next
}
