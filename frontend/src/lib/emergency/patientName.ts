export const UNKNOWN_PATIENT_NAME = 'UNKNOWN'

export function normalizePatientNameInput(value: string): string {
  return value.replace(/\s+/g, ' ').trimStart()
}

export function isUnknownPatientName(value: string): boolean {
  return value.trim().toUpperCase() === UNKNOWN_PATIENT_NAME
}

export function isValidDispatchPatientName(value: string, minLength = 2): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (isUnknownPatientName(trimmed)) return true
  return trimmed.length >= minLength
}
