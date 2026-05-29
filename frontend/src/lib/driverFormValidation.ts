export const MIN_DRIVER_AGE = 18
export const MAX_DRIVER_AGE = 65
export const MIN_PASSWORD_LENGTH = 8

export type DriverFormStep = 'personal' | 'location' | 'professional' | 'account'

export type DriverFormValues = {
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
  licenseClass: string
  licenseExpiryDate: string
  yearsOfExperience: string
  emergencyDrivingTraining: boolean
  firstAidCertified: boolean
  advancedLifeSupport: boolean
  certificationUpload: string
  email: string
  username: string
  password: string
  confirmPassword: string
  accountActive: boolean
  notes: string
}

export type DriverFormErrors = Partial<Record<keyof DriverFormValues, string>>

const NAME_PATTERN = /^[\p{L}\s'-]+$/u
const PHONE_PATTERN = /^[67]\d{7,8}$/
const NATIONAL_ID_PATTERN = /^[A-Za-z0-9-]{5,20}$/
const EMPLOYEE_CODE_PATTERN = /^DR-\d{3,}$/i
const LICENSE_PATTERN = /^[A-Za-z0-9/-]{5,25}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/

function parseDateOnly(value: string): Date | null {
  if (!value) return null
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function formatDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function calculateAge(dateOfBirth: string, referenceDate = new Date()): number | null {
  const dob = parseDateOnly(dateOfBirth)
  if (!dob) return null
  const ref = startOfDay(referenceDate)
  let age = ref.getFullYear() - dob.getFullYear()
  const monthDiff = ref.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < dob.getDate())) {
    age -= 1
  }
  return age
}

export function getDriverAgeLimits(referenceDate = new Date()): { minDob: string; maxDob: string } {
  const ref = startOfDay(referenceDate)
  const maxDob = new Date(ref)
  maxDob.setFullYear(maxDob.getFullYear() - MIN_DRIVER_AGE)

  const minDob = new Date(ref)
  minDob.setFullYear(minDob.getFullYear() - MAX_DRIVER_AGE)

  return { minDob: formatDateInput(minDob), maxDob: formatDateInput(maxDob) }
}

export function getMinJoinDate(dateOfBirth: string): string | undefined {
  const dob = parseDateOnly(dateOfBirth)
  if (!dob) return undefined
  const minJoin = new Date(dob)
  minJoin.setFullYear(minJoin.getFullYear() + MIN_DRIVER_AGE)
  return formatDateInput(minJoin)
}

export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '').replace(/^252/, '')
}

export function isValidSomaliaPhone(value: string): boolean {
  const digits = normalizePhoneDigits(value)
  return PHONE_PATTERN.test(digits)
}

export function isValidPersonName(value: string, { required = true }: { required?: boolean } = {}): boolean {
  const trimmed = value.trim()
  if (!trimmed) return !required
  return trimmed.length >= 2 && trimmed.length <= 50 && NAME_PATTERN.test(trimmed)
}

function setError(errors: DriverFormErrors, field: keyof DriverFormValues, message: string) {
  if (!errors[field]) errors[field] = message
}

function validatePersonal(form: DriverFormValues, errors: DriverFormErrors) {
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
      if (age !== null && age < MIN_DRIVER_AGE) {
        setError(errors, 'dateOfBirth', `Driver must be at least ${MIN_DRIVER_AGE} years old`)
      } else if (age !== null && age > MAX_DRIVER_AGE) {
        setError(errors, 'dateOfBirth', `Driver cannot be older than ${MAX_DRIVER_AGE} years`)
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
  }

  if (form.alternatePhone.trim()) {
    if (!isValidSomaliaPhone(form.alternatePhone)) {
      setError(errors, 'alternatePhone', 'Enter a valid alternate mobile number')
    } else if (normalizePhoneDigits(form.alternatePhone) === normalizePhoneDigits(form.phone)) {
      setError(errors, 'alternatePhone', 'Alternate phone must differ from primary phone')
    }
  }
}

function validateLocation(form: DriverFormValues, errors: DriverFormErrors) {
  const address = form.address.trim()
  if (!address) {
    setError(errors, 'address', 'Address is required')
  } else if (address.length < 10) {
    setError(errors, 'address', 'Address must be at least 10 characters')
  }

  if (!form.regionId) setError(errors, 'regionId', 'Region is required')
  if (!form.districtId) setError(errors, 'districtId', 'District is required')
  if (!form.stationId) setError(errors, 'stationId', 'Assigned station is required')
  if (!form.departmentId) setError(errors, 'departmentId', 'Department is required')

  const code = form.employeeCode.trim()
  if (!code) {
    setError(errors, 'employeeCode', 'Employee code is required')
  } else if (!EMPLOYEE_CODE_PATTERN.test(code)) {
    setError(errors, 'employeeCode', 'Code must match format DR-001')
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
        setError(errors, 'joinDate', `Join date must be on or after driver turns ${MIN_DRIVER_AGE}`)
      }
    }
  }

  if (!isValidPersonName(form.emergencyContactName)) {
    setError(errors, 'emergencyContactName', 'Enter a valid emergency contact name')
  }

  if (!form.relationship.trim()) {
    setError(errors, 'relationship', 'Relationship is required')
  } else if (form.relationship.trim().length < 2) {
    setError(errors, 'relationship', 'Relationship must be at least 2 characters')
  }

  if (!form.emergencyPhone.trim()) {
    setError(errors, 'emergencyPhone', 'Emergency contact phone is required')
  } else if (!isValidSomaliaPhone(form.emergencyPhone)) {
    setError(errors, 'emergencyPhone', 'Enter a valid emergency contact mobile')
  } else {
    const emergencyDigits = normalizePhoneDigits(form.emergencyPhone)
    if (emergencyDigits === normalizePhoneDigits(form.phone)) {
      setError(errors, 'emergencyPhone', 'Emergency phone must differ from driver phone')
    }
    if (form.alternatePhone.trim() && emergencyDigits === normalizePhoneDigits(form.alternatePhone)) {
      setError(errors, 'emergencyPhone', 'Emergency phone must differ from alternate phone')
    }
  }

  const fullName = `${form.firstName} ${form.lastName}`.trim().toLowerCase()
  if (fullName && form.emergencyContactName.trim().toLowerCase() === fullName) {
    setError(errors, 'emergencyContactName', 'Emergency contact cannot be the driver themselves')
  }
}

function validateProfessional(form: DriverFormValues, errors: DriverFormErrors) {
  const license = form.licenseNumber.trim()
  if (!license) {
    setError(errors, 'licenseNumber', 'License number is required')
  } else if (!LICENSE_PATTERN.test(license)) {
    setError(errors, 'licenseNumber', 'License number must be 5–25 characters')
  }

  if (!form.licenseClass) {
    setError(errors, 'licenseClass', 'License class is required')
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
      const maxExperience = age !== null ? Math.max(0, age - MIN_DRIVER_AGE) : 50
      if (years > maxExperience) {
        setError(errors, 'yearsOfExperience', `Experience cannot exceed ${maxExperience} years for this age`)
      }
    }
  }

  if (form.notes.trim().length > 500) {
    setError(errors, 'notes', 'Notes cannot exceed 500 characters')
  }
}

function validateAccount(form: DriverFormValues, errors: DriverFormErrors) {
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

export function validateDriverFormStep(
  step: DriverFormStep,
  form: DriverFormValues
): { valid: boolean; errors: DriverFormErrors; firstMessage: string | null } {
  const errors: DriverFormErrors = {}

  if (step === 'personal') validatePersonal(form, errors)
  if (step === 'location') validateLocation(form, errors)
  if (step === 'professional') validateProfessional(form, errors)
  if (step === 'account') validateAccount(form, errors)

  const firstMessage = Object.values(errors)[0] ?? null
  return { valid: Object.keys(errors).length === 0, errors, firstMessage }
}

export function validateDriverForm(form: DriverFormValues): {
  valid: boolean
  errors: DriverFormErrors
  firstMessage: string | null
  firstStep: DriverFormStep | null
} {
  const steps: DriverFormStep[] = ['personal', 'location', 'professional', 'account']
  const merged: DriverFormErrors = {}

  for (const step of steps) {
    const result = validateDriverFormStep(step, form)
    Object.assign(merged, result.errors)
  }

  const firstKey = Object.keys(merged)[0] as keyof DriverFormValues | undefined
  const stepByField: Partial<Record<keyof DriverFormValues, DriverFormStep>> = {
    firstName: 'personal',
    middleName: 'personal',
    lastName: 'personal',
    gender: 'personal',
    dateOfBirth: 'personal',
    nationalId: 'personal',
    phone: 'personal',
    alternatePhone: 'personal',
    address: 'location',
    regionId: 'location',
    districtId: 'location',
    stationId: 'location',
    departmentId: 'location',
    employeeCode: 'location',
    joinDate: 'location',
    emergencyContactName: 'location',
    emergencyPhone: 'location',
    relationship: 'location',
    licenseNumber: 'professional',
    licenseClass: 'professional',
    licenseExpiryDate: 'professional',
    yearsOfExperience: 'professional',
    notes: 'professional',
    email: 'account',
    username: 'account',
    password: 'account',
    confirmPassword: 'account',
  }

  return {
    valid: Object.keys(merged).length === 0,
    errors: merged,
    firstMessage: firstKey ? merged[firstKey] ?? null : null,
    firstStep: firstKey ? stepByField[firstKey] ?? null : null,
  }
}

export function validateProfilePhotoFile(file: File): string | null {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    return 'Photo must be JPG, PNG, or WEBP'
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'Photo must be smaller than 5 MB'
  }
  return null
}
