import { parseClinicalRecord, isAssessmentRecord } from '@/lib/nurse/patientCareTypes'

export const CLINICAL_OTHER = 'Other'
export const CLINICAL_VALUE_SEP = '; '

/** Five basic chief complaints + Other (6th). */
export const BASE_CHIEF_COMPLAINTS = [
  'Road accident',
  'Chest pain',
  'Difficulty breathing',
  'Unconscious / collapsed',
  'Injury / trauma',
  CLINICAL_OTHER,
] as const

/** Five basic treatments + Other (6th). */
export const BASE_TREATMENT_OPTIONS = [
  'Oxygen',
  'Bandaging',
  'IV fluid',
  'CPR',
  'Patient positioning',
  CLINICAL_OTHER,
] as const

const CHIEF_STORAGE_KEY = 'aamin_nurse_saved_chief_complaints'
const TREATMENT_STORAGE_KEY = 'aamin_nurse_saved_treatments'

function readList(key: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string' && v.trim()) : []
  } catch {
    return []
  }
}

function writeList(key: string, values: string[]) {
  if (typeof window === 'undefined') return
  const unique = [...new Set(values.map((v) => v.trim()).filter(Boolean))].slice(0, 40)
  localStorage.setItem(key, JSON.stringify(unique))
}

export function rememberChiefComplaint(values: string | string[]) {
  const list = (Array.isArray(values) ? values : [values])
    .map((v) => v.trim())
    .filter((v) => v && v !== CLINICAL_OTHER)
  if (!list.length) return
  writeList(CHIEF_STORAGE_KEY, [...list, ...readList(CHIEF_STORAGE_KEY)])
}

export function rememberTreatment(values: string | string[]) {
  const list = (Array.isArray(values) ? values : [values])
    .map((v) => v.trim())
    .filter((v) => v && v !== CLINICAL_OTHER)
  if (!list.length) return
  writeList(TREATMENT_STORAGE_KEY, [...list, ...readList(TREATMENT_STORAGE_KEY)])
}

export function getChiefComplaintOptions(_records: unknown[] = []): string[] {
  return [...BASE_CHIEF_COMPLAINTS]
}

export function getTreatmentOptions(_records: unknown[] = []): string[] {
  return [...BASE_TREATMENT_OPTIONS]
}

function knownOptions(base: readonly string[]): Set<string> {
  return new Set(base.filter((o) => o !== CLINICAL_OTHER))
}

export function parseClinicalMultiValue(
  stored: string,
  baseOptions: readonly string[] = BASE_CHIEF_COMPLAINTS,
): { selected: string[]; other: string } {
  const known = knownOptions(baseOptions)
  const raw = stored.trim()
  if (!raw) return { selected: [], other: '' }

  const parts = raw
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)

  const selected: string[] = []
  const custom: string[] = []

  for (const part of parts) {
    if (part.startsWith('Other:')) {
      custom.push(part.slice(6).trim())
      continue
    }
    const match = baseOptions.find((o) => o.toLowerCase() === part.toLowerCase())
    if (match && match !== CLINICAL_OTHER) {
      if (!selected.includes(match)) selected.push(match)
    } else if (known.has(part)) {
      if (!selected.includes(part)) selected.push(part)
    } else {
      custom.push(part)
    }
  }

  const other = custom.join('; ').trim()
  if (other && !selected.includes(CLINICAL_OTHER)) selected.push(CLINICAL_OTHER)

  return { selected, other }
}

export function serializeClinicalMultiValue(
  selected: string[],
  other: string,
  baseOptions: readonly string[] = BASE_CHIEF_COMPLAINTS,
): string {
  const known = knownOptions(baseOptions)
  const parts: string[] = []

  for (const item of selected) {
    if (item === CLINICAL_OTHER) continue
    if (known.has(item) && !parts.includes(item)) parts.push(item)
  }

  const otherTrim = other.trim()
  if (selected.includes(CLINICAL_OTHER) && otherTrim) {
    parts.push(otherTrim)
  }

  return parts.join(CLINICAL_VALUE_SEP)
}

export function formatClinicalMultiDisplay(
  stored: string,
  baseOptions: readonly string[] = BASE_CHIEF_COMPLAINTS,
): string {
  const { selected, other } = parseClinicalMultiValue(stored, baseOptions)
  const labels = selected.filter((s) => s !== CLINICAL_OTHER)
  if (other) labels.push(other)
  return labels.length ? labels.join(', ') : '—'
}

/** @deprecated single-select — use parseClinicalMultiValue */
export function resolveClinicalSelectValue(stored: string, options: string[]) {
  const multi = parseClinicalMultiValue(stored, options)
  if (multi.selected.length === 1 && !multi.other) {
    return { selection: multi.selected[0], other: '' }
  }
  if (multi.other) return { selection: CLINICAL_OTHER, other: multi.other }
  return { selection: multi.selected[0] || '', other: '' }
}

/** @deprecated single-select */
export function resolveClinicalSelectSave(selection: string, other: string): string {
  if (selection === CLINICAL_OTHER) return other.trim()
  return selection.trim()
}
