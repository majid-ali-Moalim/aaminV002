export type HandoverFormFields = {
  acceptedHospital: string
  patientOutcome: string
  patientCondition: string
  treatmentGiven: string
  receivingStaff: string
  notes: string
  signature: string
}

export type HandoverFieldErrors = Partial<Record<keyof HandoverFormFields, string>>

const MAX_TEXT = 2000
const MAX_NAME = 120

function optionalText(value: string, max: number, label: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.length > max) return `${label} must be ${max} characters or less`
  return undefined
}

export function validateHandoverForm(form: HandoverFormFields): HandoverFieldErrors {
  const errors: HandoverFieldErrors = {}

  if (!form.acceptedHospital.trim()) {
    errors.acceptedHospital = 'Destination hospital from dispatch is missing — contact dispatcher'
  }

  if (!form.patientOutcome) {
    errors.patientOutcome = 'Select whether the patient is live or dead'
  } else if (!['Live', 'Deceased'].includes(form.patientOutcome)) {
    errors.patientOutcome = 'Select Live or Dead'
  }

  const conditionErr = optionalText(form.patientCondition, MAX_TEXT, 'Patient condition summary')
  if (conditionErr) errors.patientCondition = conditionErr

  const treatmentErr = optionalText(form.treatmentGiven, MAX_TEXT, 'Treatment given')
  if (treatmentErr) errors.treatmentGiven = treatmentErr

  const receivingErr = optionalText(form.receivingStaff, MAX_NAME, 'Receiving doctor name')
  if (receivingErr) errors.receivingStaff = receivingErr

  const notesErr = optionalText(form.notes, MAX_TEXT, 'Handover notes')
  if (notesErr) errors.notes = notesErr

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
