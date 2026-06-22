import type { Priority } from '@/types'

export const TRIAGE_PRIORITY_OPTIONS: { value: Priority; label: string; hint: string }[] = [
  { value: 'CRITICAL', label: 'Critical', hint: 'Life-threatening — immediate dispatch' },
  { value: 'HIGH', label: 'High', hint: 'Serious — urgent response' },
  { value: 'MEDIUM', label: 'Medium', hint: 'Moderate — standard response' },
  { value: 'LOW', label: 'Low', hint: 'Non-urgent — routine response' },
]

export const CONSCIOUS_STATUS_OPTIONS = [
  { value: 'CONSCIOUS', label: 'Conscious' },
  { value: 'SEMI_CONSCIOUS', label: 'Semi-conscious / drowsy' },
  { value: 'UNCONSCIOUS', label: 'Unconscious' },
]

export const BREATHING_STATUS_OPTIONS = [
  { value: 'NORMAL', label: 'Normal breathing' },
  { value: 'DIFFICULTY', label: 'Difficulty breathing' },
  { value: 'DIFFICULT', label: 'Difficulty breathing' },
  { value: 'LABORED', label: 'Labored / shallow' },
  { value: 'NOT_BREATHING', label: 'Not breathing' },
  { value: 'ARREST', label: 'Not breathing / arrest' },
]

export const BLEEDING_STATUS_OPTIONS = [
  { value: 'NONE', label: 'No bleeding' },
  { value: 'MILD', label: 'Mild bleeding' },
  { value: 'MODERATE', label: 'Moderate bleeding' },
  { value: 'SEVERE', label: 'Severe / uncontrolled' },
]
