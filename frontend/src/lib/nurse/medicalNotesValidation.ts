export type MedicalNotesFormFields = {
  chiefComplaint: string
  symptoms: string
  consciousnessLevel: string
  painLevel: string
  breathingStatus: string
  injuryDescription: string
  assessmentNotes: string
  bloodPressure: string
  heartRate: string
  temperature: string
  oxygenSaturation: string
  respiratoryRate: string
  observations: string
  condition: string
  progress: string
  treatmentType: string
  treatmentOtherDetails: string
  medication: string
  notes: string
}

export type MedicalNotesFieldErrors = Partial<Record<keyof MedicalNotesFormFields, string>>

const MAX_CHIEF_COMPLAINT = 500
const MAX_TEXT = 2000
const MAX_SHORT = 500
const MAX_MEDICATION = 300

function optionalText(value: string, max: number, label: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.length > max) return `${label} must be ${max} characters or less`
  return undefined
}

function validateBloodPressure(bp: string): string | undefined {
  const trimmed = bp.trim()
  if (!trimmed) return undefined
  const match = /^(\d{2,3})\/(\d{2,3})$/.exec(trimmed)
  if (!match) return 'Use format like 120/80 (systolic/diastolic)'
  const systolic = Number(match[1])
  const diastolic = Number(match[2])
  if (systolic < 70 || systolic > 250) return 'Systolic must be between 70 and 250'
  if (diastolic < 40 || diastolic > 150) return 'Diastolic must be between 40 and 150'
  if (systolic <= diastolic) return 'Systolic must be higher than diastolic'
  return undefined
}

function validateWholeNumber(value: string, min: number, max: number, label: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (!/^\d+$/.test(trimmed)) return `${label} must be a whole number`
  const n = Number(trimmed)
  if (n < min || n > max) return `${label} must be between ${min} and ${max}`
  return undefined
}

function validateDecimal(value: string, min: number, max: number, label: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return `${label} must be a valid number (e.g. 36.5)`
  const n = Number(trimmed)
  if (n < min || n > max) return `${label} must be between ${min} and ${max}`
  return undefined
}

/** Returns field-level errors; empty object means the form is valid. */
export function validateMedicalNotesForm(form: MedicalNotesFormFields): MedicalNotesFieldErrors {
  const errors: MedicalNotesFieldErrors = {}

  const chief = form.chiefComplaint.trim()
  if (!chief) {
    errors.chiefComplaint = 'Chief complaint is required'
  } else if (chief.length < 3) {
    errors.chiefComplaint = 'Enter at least 3 characters'
  } else if (chief.length > MAX_CHIEF_COMPLAINT) {
    errors.chiefComplaint = `Chief complaint must be ${MAX_CHIEF_COMPLAINT} characters or less`
  }

  const symptomsErr = optionalText(form.symptoms, MAX_TEXT, 'Symptoms')
  if (symptomsErr) errors.symptoms = symptomsErr

  const injuryErr = optionalText(form.injuryDescription, MAX_SHORT, 'Injury description')
  if (injuryErr) errors.injuryDescription = injuryErr

  const assessmentNotesErr = optionalText(form.assessmentNotes, MAX_TEXT, 'Assessment notes')
  if (assessmentNotesErr) errors.assessmentNotes = assessmentNotesErr

  const bpErr = validateBloodPressure(form.bloodPressure)
  if (bpErr) errors.bloodPressure = bpErr

  const hrErr = validateWholeNumber(form.heartRate, 30, 220, 'Pulse rate')
  if (hrErr) errors.heartRate = hrErr

  const tempErr = validateDecimal(form.temperature, 30, 45, 'Temperature')
  if (tempErr) errors.temperature = tempErr

  const spo2Err = validateWholeNumber(form.oxygenSaturation, 50, 100, 'Oxygen saturation')
  if (spo2Err) errors.oxygenSaturation = spo2Err

  const rrErr = validateWholeNumber(form.respiratoryRate, 4, 60, 'Respiratory rate')
  if (rrErr) errors.respiratoryRate = rrErr

  const observationsErr = optionalText(form.observations, MAX_TEXT, 'Observations')
  if (observationsErr) errors.observations = observationsErr

  const conditionErr = optionalText(form.condition, MAX_TEXT, 'Patient condition')
  if (conditionErr) errors.condition = conditionErr

  const progressErr = optionalText(form.progress, MAX_TEXT, 'Progress update')
  if (progressErr) errors.progress = progressErr

  const medicationErr = optionalText(form.medication, MAX_MEDICATION, 'Medication / details')
  if (medicationErr) errors.medication = medicationErr

  const notesErr = optionalText(form.notes, MAX_TEXT, 'Notes')
  if (notesErr) errors.notes = notesErr

  if (form.treatmentType === 'Other' && !form.treatmentOtherDetails.trim()) {
    errors.treatmentOtherDetails = 'Describe the other treatment given'
  } else {
    const otherErr = optionalText(form.treatmentOtherDetails, MAX_TEXT, 'Other treatment details')
    if (otherErr) errors.treatmentOtherDetails = otherErr
  }

  return errors
}

export function hasMedicalNotesErrors(errors: MedicalNotesFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function firstMedicalNotesError(errors: MedicalNotesFieldErrors): string | undefined {
  return Object.values(errors)[0]
}
