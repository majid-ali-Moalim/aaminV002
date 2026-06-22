export type AmbulanceFormStep = 'identity' | 'vehicle' | 'station' | 'equipment' | 'review'

export type AmbulanceFormValues = {
  ambulanceNumber: string
  plateNumber: string
  vehicleType: string
  vehicleBrand: string
  vehicleModel: string
  vehicleYear: number
  status: string
  regionId: string
  districtId: string
  stationId: string
  assignedDriverId: string
  assignedNurseId: string
  oxygenAvailable: boolean
  defibrillatorAvailable: boolean
  registrationExpiry: string
  registrationDocumentUrl: string
  notes: string
}

export type AmbulanceFormErrors = Partial<Record<keyof AmbulanceFormValues, string>>

const AMBULANCE_ID_PATTERN = /^[A-Za-z0-9-]{3,20}$/
const PLATE_PATTERN = /^[A-Za-z0-9-\s]{3,15}$/

function parseDateOnly(value: string): Date | null {
  if (!value) return null
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function setError(errors: AmbulanceFormErrors, field: keyof AmbulanceFormValues, message: string) {
  if (!errors[field]) errors[field] = message
}

function validateIdentity(form: AmbulanceFormValues, errors: AmbulanceFormErrors) {
  const id = form.ambulanceNumber.trim()
  if (!id) {
    setError(errors, 'ambulanceNumber', 'Ambulance ID is required')
  } else if (!AMBULANCE_ID_PATTERN.test(id)) {
    setError(errors, 'ambulanceNumber', 'Use 3–20 letters, numbers, or hyphens (e.g. AMB-001)')
  }

  const plate = form.plateNumber.trim()
  if (!plate) {
    setError(errors, 'plateNumber', 'Plate number is required')
  } else if (!PLATE_PATTERN.test(plate)) {
    setError(errors, 'plateNumber', 'Enter a valid plate number (e.g. SO-12345)')
  }

  if (form.registrationExpiry) {
    const expiry = parseDateOnly(form.registrationExpiry)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (!expiry) {
      setError(errors, 'registrationExpiry', 'Invalid registration expiry date')
    } else if (expiry <= today) {
      setError(errors, 'registrationExpiry', 'Registration expiry must be in the future')
    }
  }
}

function validateVehicle(
  form: AmbulanceFormValues,
  errors: AmbulanceFormErrors,
  allowedTypes: string[],
) {
  if (!form.vehicleType.trim()) {
    setError(errors, 'vehicleType', 'Select an ambulance type')
  } else if (allowedTypes.length > 0 && !allowedTypes.includes(form.vehicleType)) {
    setError(errors, 'vehicleType', 'Select a valid ambulance type from master data')
  }

  if (!form.vehicleBrand.trim()) {
    setError(errors, 'vehicleBrand', 'Brand is required')
  } else if (form.vehicleBrand.trim().length < 2) {
    setError(errors, 'vehicleBrand', 'Brand must be at least 2 characters')
  }

  if (!form.vehicleModel.trim()) {
    setError(errors, 'vehicleModel', 'Model is required')
  } else if (form.vehicleModel.trim().length < 2) {
    setError(errors, 'vehicleModel', 'Model must be at least 2 characters')
  }

  const year = Number(form.vehicleYear)
  const maxYear = new Date().getFullYear() + 1
  if (!year || !Number.isFinite(year)) {
    setError(errors, 'vehicleYear', 'Enter a valid year')
  } else if (year < 1990 || year > maxYear) {
    setError(errors, 'vehicleYear', `Year must be between 1990 and ${maxYear}`)
  }
}

function validateStation(form: AmbulanceFormValues, errors: AmbulanceFormErrors) {
  if (!form.stationId) {
    setError(errors, 'stationId', 'Select a base station')
  }
}

function validateEquipment(form: AmbulanceFormValues, errors: AmbulanceFormErrors) {
  if (form.notes.trim().length > 500) {
    setError(errors, 'notes', 'Notes cannot exceed 500 characters')
  }
}

export function validateAmbulanceFormStep(
  step: AmbulanceFormStep,
  form: AmbulanceFormValues,
  allowedTypes: string[] = [],
): { valid: boolean; errors: AmbulanceFormErrors; firstMessage: string | null } {
  const errors: AmbulanceFormErrors = {}

  if (step === 'identity') validateIdentity(form, errors)
  if (step === 'vehicle') validateVehicle(form, errors, allowedTypes)
  if (step === 'station') validateStation(form, errors)
  if (step === 'equipment') validateEquipment(form, errors)

  const firstMessage = Object.values(errors)[0] ?? null
  return { valid: Object.keys(errors).length === 0, errors, firstMessage }
}

export function validateAmbulanceForm(
  form: AmbulanceFormValues,
  allowedTypes: string[] = [],
): {
  valid: boolean
  errors: AmbulanceFormErrors
  firstMessage: string | null
  firstStep: AmbulanceFormStep | null
} {
  const steps: AmbulanceFormStep[] = ['identity', 'vehicle', 'station', 'equipment']
  const merged: AmbulanceFormErrors = {}

  for (const step of steps) {
    const result = validateAmbulanceFormStep(step, form, allowedTypes)
    Object.assign(merged, result.errors)
  }

  const firstKey = Object.keys(merged)[0] as keyof AmbulanceFormValues | undefined
  const stepByField: Partial<Record<keyof AmbulanceFormValues, AmbulanceFormStep>> = {
    ambulanceNumber: 'identity',
    plateNumber: 'identity',
    registrationExpiry: 'identity',
    vehicleType: 'vehicle',
    vehicleBrand: 'vehicle',
    vehicleModel: 'vehicle',
    vehicleYear: 'vehicle',
    stationId: 'station',
    notes: 'equipment',
  }

  return {
    valid: Object.keys(merged).length === 0,
    errors: merged,
    firstMessage: firstKey ? merged[firstKey] ?? null : null,
    firstStep: firstKey ? stepByField[firstKey] ?? null : null,
  }
}
