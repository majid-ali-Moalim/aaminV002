import type { RejectedHospitalEntry } from '@/lib/emergency/buildCaseClosureDefaults'

export type HandoverFormFields = {
  acceptedHospital: string
  rejectedHospitals: RejectedHospitalEntry[]
  patientOutcome: string
  patientCondition: string
  treatmentGiven: string
  receivingStaff: string
  notes: string
  signature: string
}

export type HandoverFieldErrors = Partial<Record<keyof HandoverFormFields, string>>

export function sanitizeHandoverRejectedHospitals(entries: RejectedHospitalEntry[]) {
  return entries.filter((entry) => entry.hospitalName.trim())
}

export type HandoverValidationOptions = {
  /** Destination already set by dispatcher on the case */
  assignedDestination?: string
}

const MAX_TEXT = 2000
const MAX_NAME = 120
const MAX_DESTINATION = 200

function optionalText(value: string, max: number, label: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.length > max) return `${label} must be ${max} characters or less`
  return undefined
}

export function validateHandoverForm(
  form: HandoverFormFields,
  options?: HandoverValidationOptions,
): HandoverFieldErrors {
  const errors: HandoverFieldErrors = {}
  const assignedDestination = options?.assignedDestination?.trim() ?? ''
  const nurseDestination = form.acceptedHospital.trim()
  const effectiveDestination = assignedDestination || nurseDestination

  if (!effectiveDestination) {
    errors.acceptedHospital = assignedDestination
      ? 'Destination hospital is required'
      : 'Enter the destination hospital where the patient was handed over'
  } else if (!assignedDestination && nurseDestination.length > MAX_DESTINATION) {
    errors.acceptedHospital = `Destination must be ${MAX_DESTINATION} characters or less`
  }

  if (!form.patientOutcome) {
    errors.patientOutcome = 'Select whether the patient is live, dead, or unknown'
  } else if (!['Live', 'Deceased', 'Unknown'].includes(form.patientOutcome)) {
    errors.patientOutcome = 'Select Live, Dead, or Unknown'
  }

  const conditionErr = optionalText(form.patientCondition, MAX_TEXT, 'Patient condition summary')
  if (conditionErr) errors.patientCondition = conditionErr

  const treatmentErr = optionalText(form.treatmentGiven, MAX_TEXT, 'Treatment given')
  if (treatmentErr) errors.treatmentGiven = treatmentErr

  const receivingErr = optionalText(form.receivingStaff, MAX_NAME, 'Receiving doctor name')
  if (receivingErr) errors.receivingStaff = receivingErr

  const notesErr = optionalText(form.notes, MAX_TEXT, 'Handover notes')
  if (notesErr) errors.notes = notesErr

  for (const entry of form.rejectedHospitals ?? []) {
    const name = entry.hospitalName.trim()
    const hasOther = Boolean(entry.reason || entry.notes.trim())
    if (!name && !hasOther) continue
    if (!name) {
      errors.rejectedHospitals = 'Enter the hospital name for each rejected hospital entry'
      break
    }
    if (name.length > MAX_NAME) {
      errors.rejectedHospitals = `Rejected hospital name must be ${MAX_NAME} characters or less`
      break
    }
    const entryNotesErr = optionalText(entry.notes, MAX_TEXT, 'Rejected hospital notes')
    if (entryNotesErr) {
      errors.rejectedHospitals = entryNotesErr
      break
    }
  }

  if (!form.signature.trim()) {
    errors.signature = 'Digital signature is required'
  } else if (form.signature.trim().length < 3) {
    errors.signature = 'Enter your full name (at least 3 characters)'
  } else if (form.signature.trim().length > MAX_NAME) {
    errors.signature = `Signature must be ${MAX_NAME} characters or less`
  }

  return errors
}

export function hasHandoverErrors(errors: HandoverFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function firstHandoverError(errors: HandoverFieldErrors): string | undefined {
  return Object.values(errors)[0]
}
