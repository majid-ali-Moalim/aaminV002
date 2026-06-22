import type { BloodType, Gender, Patient } from '@/types'

const BLOOD_LABELS: Record<BloodType, string> = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A−',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B−',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB−',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O−',
}

export function formatBloodType(value?: BloodType | null): string {
  if (!value) return '—'
  return BLOOD_LABELS[value] ?? value.replace('_', ' ')
}

export function formatGender(value?: Gender | null): string {
  if (!value) return '—'
  return value === 'MALE' ? 'Male' : value === 'FEMALE' ? 'Female' : value
}

export function calcPatientAge(patient: Pick<Patient, 'age' | 'dateOfBirth'>): number | null {
  if (patient.age != null && patient.age >= 0) return patient.age
  if (!patient.dateOfBirth) return null
  const dob = new Date(patient.dateOfBirth)
  if (Number.isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1
  return age >= 0 ? age : null
}

export function formatPatientAge(patient: Pick<Patient, 'age' | 'dateOfBirth'>): string {
  const age = calcPatientAge(patient)
  return age != null ? String(age) : '—'
}

export function formatDateShort(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTimeShort(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
