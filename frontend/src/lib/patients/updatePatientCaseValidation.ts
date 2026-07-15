import { isValidSomaliaPhone } from '@/lib/driverFormValidation'
import { AGE_GROUPS } from '@/components/public/hire-ambulance/constants'
import { BloodType, Gender, NationalityType, Priority } from '@/types'

export type UpdateCaseFormValues = {
  // Patient
  fullName: string
  phone: string
  alternatePhone: string
  email: string
  gender: '' | Gender
  bloodType: '' | BloodType
  nationalityType: NationalityType
  country: string
  ageGroup: string
  age: string
  dateOfBirth: string
  address: string
  regionId: string
  districtId: string
  maritalStatus: string
  conditions: string
  allergies: string
  insuranceProvider: string
  // Case
  priority: Priority
  callerName: string
  callerPhone: string
  pickupLocation: string
  pickupLandmark: string
  destination: string
  patientCondition: string
  symptoms: string
  consciousStatus: string
  breathingStatus: string
  bleedingStatus: string
  needsOxygen: boolean
  needsStretcher: boolean
  notes: string
  caseRegionId: string
  caseDistrictId: string
}

export type UpdateCaseFormErrors = Partial<Record<keyof UpdateCaseFormValues, string>>

const NAME_PATTERN = /^[\p{L}\s'-]+$/u

export function ageGroupFromAge(age: number | null | undefined): string {
  if (age == null || age < 0) return ''
  if (age <= 1) return 'INFANT'
  if (age <= 5) return 'TODDLER'
  if (age <= 12) return 'CHILD'
  if (age <= 17) return 'TEENAGER'
  if (age <= 35) return 'YOUNG_ADULT'
  if (age <= 59) return 'ADULT'
  return 'SENIOR'
}

export function ageFromGroup(ageGroup: string): number | null {
  const row = AGE_GROUPS.find((g) => g.value === ageGroup)
  return row ? row.age : null
}

export function resolveFormAge(values: UpdateCaseFormValues): number | null {
  if (values.dateOfBirth.trim()) {
    const dob = new Date(`${values.dateOfBirth}T00:00:00`)
    if (!Number.isNaN(dob.getTime())) {
      const today = new Date()
      let age = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1
      return age >= 0 ? age : null
    }
  }
  if (values.age.trim()) {
    const n = parseInt(values.age, 10)
    return Number.isNaN(n) ? null : n
  }
  return ageFromGroup(values.ageGroup)
}

export function validateUpdateCaseForm(values: UpdateCaseFormValues): UpdateCaseFormErrors {
  const errors: UpdateCaseFormErrors = {}

  const name = values.fullName.trim()
  if (!name) errors.fullName = 'Patient name is required'
  else if (name.length < 2 || !NAME_PATTERN.test(name)) {
    errors.fullName = 'Enter a valid patient name'
  }

  if (!values.phone.trim()) errors.phone = 'Phone number is required'
  else if (!isValidSomaliaPhone(values.phone)) {
    errors.phone = 'Enter a valid Somali phone number'
  }

  if (values.alternatePhone.trim() && !isValidSomaliaPhone(values.alternatePhone)) {
    errors.alternatePhone = 'Enter a valid alternate phone number'
  }

  if (values.callerPhone.trim() && !isValidSomaliaPhone(values.callerPhone)) {
    errors.callerPhone = 'Enter a valid caller phone number'
  }

  if (
    values.nationalityType === NationalityType.INTERNATIONAL &&
    !values.country.trim()
  ) {
    errors.country = 'Country is required for international patients'
  }

  const resolvedAge = resolveFormAge(values)
  if (resolvedAge != null && (resolvedAge < 0 || resolvedAge > 120)) {
    errors.age = 'Age must be between 0 and 120'
  }

  if (!values.pickupLocation.trim()) {
    errors.pickupLocation = 'Pickup location is required'
  }

  if (!values.priority) errors.priority = 'Priority is required'

  return errors
}

export function firstUpdateCaseError(errors: UpdateCaseFormErrors): string | null {
  const v = Object.values(errors).find(Boolean)
  return v ?? null
}
