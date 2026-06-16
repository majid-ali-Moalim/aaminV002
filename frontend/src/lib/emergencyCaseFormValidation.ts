import { Priority, RequestSource } from '@/types'
import { isValidSomaliaPhone, normalizePhoneDigits } from '@/lib/driverFormValidation'

export type EmergencyCaseStep = 'patient' | 'emergency' | 'location' | 'dispatch'

export type NewPatientFormValues = {
  fullName: string
  age: string
  dateOfBirth: string
  gender: '' | 'MALE' | 'FEMALE'
  bloodType: string
  phone: string
  alternatePhone: string
  nationalityType: string
  country: string
  maritalStatus: string
}

export type EmergencyCaseFormValues = {
  patientId: string
  priority: Priority
  incidentCategoryId: string
  requestSource: RequestSource
  regionId: string
  districtId: string
  pickupLocation: string
  destination: string
  destinationHospitalId: string
  callerName: string
  callerPhone: string
  symptoms: string
  patientCondition: string
  consciousStatus: string
  breathingStatus: string
  bleedingStatus: string
  needsOxygen: boolean
  needsStretcher: boolean
  notes: string
  manualDispatchNotes: string
  ambulanceId: string
  driverId: string
  nurseId: string
  newPatient: NewPatientFormValues
}

export type EmergencyCaseFormErrors = Partial<Record<string, string>>

const FULL_NAME_PATTERN = /^[\p{L}\s'-]+$/u
const MAX_NOTES_LENGTH = 1000
const MIN_PICKUP_LENGTH = 2
const MAX_PICKUP_LENGTH = 20
const MIN_CLINICAL_TEXT = 10
export const MAX_PATIENT_AGE = 120

function setError(errors: EmergencyCaseFormErrors, field: string, message: string) {
  if (!errors[field]) errors[field] = message
}

function isValidFullName(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length >= 2 && trimmed.length <= 100 && FULL_NAME_PATTERN.test(trimmed)
}

function isValidOptionalName(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  return trimmed.length >= 2 && trimmed.length <= 80 && FULL_NAME_PATTERN.test(trimmed)
}

function parseDateOnly(value: string): Date | null {
  if (!value) return null
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function calculateAgeFromDob(dateOfBirth: string): number | null {
  const dob = parseDateOnly(dateOfBirth)
  if (!dob) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1
  }
  return age
}

function isLifeThreateningVitals(form: EmergencyCaseFormValues): boolean {
  return (
    form.consciousStatus === 'UNCONSCIOUS' ||
    form.breathingStatus === 'ARREST' ||
    form.bleedingStatus === 'SEVERE'
  )
}

function resolveCallerPhone(form: EmergencyCaseFormValues, isNewPatient: boolean): string {
  if (form.callerPhone.trim()) return normalizePhoneDigits(form.callerPhone)
  if (isNewPatient && form.newPatient.phone.trim()) return normalizePhoneDigits(form.newPatient.phone)
  return ''
}

function validatePatientStep(
  form: EmergencyCaseFormValues,
  isNewPatient: boolean,
  errors: EmergencyCaseFormErrors
) {
  if (isNewPatient) {
    if (!isValidFullName(form.newPatient.fullName)) {
      setError(errors, 'newPatient.fullName', 'Enter a valid patient name (2–100 letters)')
    }

    if (!form.newPatient.phone.trim()) {
      setError(errors, 'newPatient.phone', 'Patient phone is required')
    } else if (!isValidSomaliaPhone(form.newPatient.phone)) {
      setError(errors, 'newPatient.phone', 'Enter a valid Somalia mobile (9 digits, starts with 6 or 7)')
    }

    if (form.newPatient.alternatePhone.trim()) {
      if (!isValidSomaliaPhone(form.newPatient.alternatePhone)) {
        setError(errors, 'newPatient.alternatePhone', 'Enter a valid alternate mobile')
      } else if (
        normalizePhoneDigits(form.newPatient.alternatePhone) === normalizePhoneDigits(form.newPatient.phone)
      ) {
        setError(errors, 'newPatient.alternatePhone', 'Alternate phone must differ from primary')
      }
    }

    if (form.newPatient.age.trim()) {
      const age = Number(form.newPatient.age)
      if (!Number.isInteger(age) || age < 0) {
        setError(errors, 'newPatient.age', 'Age cannot be negative')
      } else if (age > MAX_PATIENT_AGE) {
        setError(errors, 'newPatient.age', `Age cannot exceed ${MAX_PATIENT_AGE}`)
      }
    }

    if (form.newPatient.dateOfBirth) {
      const dob = parseDateOnly(form.newPatient.dateOfBirth)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (!dob) {
        setError(errors, 'newPatient.dateOfBirth', 'Invalid date of birth')
      } else if (dob > today) {
        setError(errors, 'newPatient.dateOfBirth', 'Date of birth cannot be in the future')
      } else {
        const dobAge = calculateAgeFromDob(form.newPatient.dateOfBirth)
        if (dobAge !== null && dobAge > MAX_PATIENT_AGE) {
          setError(errors, 'newPatient.dateOfBirth', `Patient age cannot exceed ${MAX_PATIENT_AGE}`)
        }
      }
    }

    if (form.newPatient.age.trim() && form.newPatient.dateOfBirth) {
      const enteredAge = Number(form.newPatient.age)
      const dobAge = calculateAgeFromDob(form.newPatient.dateOfBirth)
      if (
        Number.isInteger(enteredAge) &&
        dobAge !== null &&
        Math.abs(enteredAge - dobAge) > 1
      ) {
        setError(errors, 'newPatient.age', 'Age does not match date of birth')
      }
    }

    if (!form.newPatient.age.trim() && !form.newPatient.dateOfBirth) {
      setError(errors, 'newPatient.age', 'Provide patient age or date of birth')
    }
  } else if (!form.patientId) {
    setError(errors, 'patientId', 'Select an existing patient')
  }

  if (!isValidOptionalName(form.callerName)) {
    setError(errors, 'callerName', 'Enter a valid caller name')
  }

  const needsCallerPhone =
    form.requestSource === RequestSource.PHONE_CALL ||
    form.requestSource === RequestSource.WALK_IN

  if (form.callerPhone.trim() && !isValidSomaliaPhone(form.callerPhone)) {
    setError(errors, 'callerPhone', 'Enter a valid caller mobile number')
  } else if (needsCallerPhone && !resolveCallerPhone(form, isNewPatient)) {
    setError(errors, 'callerPhone', 'Caller phone is required for phone/walk-in requests')
  }
}

function validateEmergencyStep(form: EmergencyCaseFormValues, errors: EmergencyCaseFormErrors) {
  if (!form.incidentCategoryId) {
    setError(errors, 'incidentCategoryId', 'Incident category is required')
  }

  const conditionText = form.patientCondition.trim()
  const symptomsText = form.symptoms.trim()

  if (form.priority === Priority.CRITICAL || form.priority === Priority.HIGH) {
    if (!conditionText && !symptomsText) {
      setError(errors, 'patientCondition', 'Describe condition or symptoms for high-priority cases')
      setError(errors, 'symptoms', 'Describe condition or symptoms for high-priority cases')
    } else {
      if (conditionText && conditionText.length < MIN_CLINICAL_TEXT) {
        setError(errors, 'patientCondition', `Condition summary must be at least ${MIN_CLINICAL_TEXT} characters`)
      }
      if (symptomsText && symptomsText.length < MIN_CLINICAL_TEXT) {
        setError(errors, 'symptoms', `Symptoms must be at least ${MIN_CLINICAL_TEXT} characters`)
      }
    }
  }

  if (conditionText.length > 500) {
    setError(errors, 'patientCondition', 'Condition summary cannot exceed 500 characters')
  }
  if (symptomsText.length > 500) {
    setError(errors, 'symptoms', 'Symptoms cannot exceed 500 characters')
  }

  if (isLifeThreateningVitals(form) && (form.priority === Priority.LOW || form.priority === Priority.MEDIUM)) {
    setError(
      errors,
      'priority',
      'Priority must be High or Critical for unconscious, breathing arrest, or severe bleeding'
    )
  }

  if (form.priority === Priority.CRITICAL) {
    if (form.breathingStatus === 'NORMAL' && form.consciousStatus === 'CONSCIOUS' && form.bleedingStatus === 'NONE') {
      if (!conditionText && !symptomsText) {
        setError(errors, 'priority', 'Critical priority requires life-threatening details')
      }
    }
  }
}

function validateLocationStep(
  form: EmergencyCaseFormValues,
  errors: EmergencyCaseFormErrors,
  districtCount: number,
) {
  if (!form.regionId) {
    setError(errors, 'regionId', 'Region is required')
  }

  if (form.regionId && districtCount > 0 && !form.districtId) {
    setError(errors, 'districtId', 'District is required for the selected region')
  }

  const pickup = form.pickupLocation.trim()
  if (!pickup) {
    setError(errors, 'pickupLocation', 'Pickup address is required')
  } else if (pickup.length < MIN_PICKUP_LENGTH) {
    setError(errors, 'pickupLocation', `Pickup address must be at least ${MIN_PICKUP_LENGTH} characters`)
  } else if (pickup.length > MAX_PICKUP_LENGTH) {
    setError(errors, 'pickupLocation', `Pickup address cannot exceed ${MAX_PICKUP_LENGTH} characters`)
  }

  if (form.priority === Priority.CRITICAL || form.priority === Priority.HIGH) {
    if (!form.destinationHospitalId && !form.destination.trim()) {
      setError(errors, 'destination', 'Select a hospital or enter destination for urgent cases')
      setError(errors, 'destinationHospitalId', 'Select a hospital or enter destination for urgent cases')
    }
  }

  if (form.destination.trim().length > 200) {
    setError(errors, 'destination', 'Destination text cannot exceed 200 characters')
  }
}

function validateDispatchStep(form: EmergencyCaseFormValues, errors: EmergencyCaseFormErrors) {
  if (form.notes.length > MAX_NOTES_LENGTH) {
    setError(errors, 'notes', `Internal notes cannot exceed ${MAX_NOTES_LENGTH} characters`)
  }
  if (form.manualDispatchNotes.length > MAX_NOTES_LENGTH) {
    setError(errors, 'manualDispatchNotes', `Dispatch notes cannot exceed ${MAX_NOTES_LENGTH} characters`)
  }
}

export function validateEmergencyCaseStep(
  step: EmergencyCaseStep,
  form: EmergencyCaseFormValues,
  options: { isNewPatient: boolean; districtCount?: number }
): { valid: boolean; errors: EmergencyCaseFormErrors; firstMessage: string | null } {
  const errors: EmergencyCaseFormErrors = {}

  if (step === 'patient') validatePatientStep(form, options.isNewPatient, errors)
  if (step === 'emergency') validateEmergencyStep(form, errors)
  if (step === 'location') validateLocationStep(form, errors, options.districtCount ?? 0)
  if (step === 'dispatch') validateDispatchStep(form, errors)

  const firstMessage = Object.values(errors)[0] ?? null
  return { valid: Object.keys(errors).length === 0, errors, firstMessage }
}

export function validateEmergencyCaseForm(
  form: EmergencyCaseFormValues,
  options: { isNewPatient: boolean; districtCount?: number }
): {
  valid: boolean
  errors: EmergencyCaseFormErrors
  firstMessage: string | null
  firstStep: EmergencyCaseStep | null
} {
  const steps: EmergencyCaseStep[] = ['patient', 'emergency', 'location', 'dispatch']
  const merged: EmergencyCaseFormErrors = {}

  for (const step of steps) {
    const result = validateEmergencyCaseStep(step, form, options)
    Object.assign(merged, result.errors)
  }

  const firstKey = Object.keys(merged)[0]
  const stepByField: Record<string, EmergencyCaseStep> = {
    patientId: 'patient',
    callerName: 'patient',
    callerPhone: 'patient',
    'newPatient.fullName': 'patient',
    'newPatient.phone': 'patient',
    'newPatient.alternatePhone': 'patient',
    'newPatient.age': 'patient',
    'newPatient.dateOfBirth': 'patient',
    incidentCategoryId: 'emergency',
    patientCondition: 'emergency',
    symptoms: 'emergency',
    priority: 'emergency',
    regionId: 'location',
    districtId: 'location',
    pickupLocation: 'location',
    destination: 'location',
    destinationHospitalId: 'location',
    notes: 'dispatch',
    manualDispatchNotes: 'dispatch',
  }

  return {
    valid: Object.keys(merged).length === 0,
    errors: merged,
    firstMessage: firstKey ? merged[firstKey] ?? null : null,
    firstStep: firstKey ? stepByField[firstKey] ?? null : null,
  }
}

export function phoneDigits(value: string): string {
  return normalizePhoneDigits(value).slice(0, 9)
}
