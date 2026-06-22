/** Somalia driver licensing — Ministry of Transport & Civil Aviation (federal) / regional authorities. */

export const SOMALIA_LICENSE_VALIDITY_YEARS = 5

export const SOMALIA_LICENSE_ISSUING_AUTHORITY =
  'Ministry of Transport and Civil Aviation (MoTCA) — federal licenses; regional authorities may also issue.'

export type SomaliaLicenseClassId = 'A' | 'B' | 'C' | 'D' | 'E'

export type SomaliaLicenseClass = {
  id: SomaliaLicenseClassId
  label: string
  description: string
}

/** Standard vehicle classes aligned with international conventions. */
export const SOMALIA_DRIVER_LICENSE_CLASSES: SomaliaLicenseClass[] = [
  {
    id: 'A',
    label: 'Class A',
    description: 'Motorcycles and mopeds',
  },
  {
    id: 'B',
    label: 'Class B',
    description: 'Passenger cars, small vans, and light pickup trucks (GVW ≤ 3,500 kg)',
  },
  {
    id: 'C',
    label: 'Class C',
    description: 'Heavy motor vehicles and trucks',
  },
  {
    id: 'D',
    label: 'Class D',
    description: 'Passenger Service Vehicles (PSVs) — minibuses and buses',
  },
  {
    id: 'E',
    label: 'Class E',
    description: 'Combination vehicles (trucks with heavy trailers)',
  },
]

/** Typical classes for ambulance / emergency fleet drivers. */
export const SOMALIA_AMBULANCE_LICENSE_CLASSES: SomaliaLicenseClassId[] = ['B', 'C', 'D']

export const SOMALIA_LICENSE_CLASS_IDS = SOMALIA_DRIVER_LICENSE_CLASSES.map((c) => c.id)

export const SOMALIA_LICENSE_NUMBER_HINT =
  'Unique alphanumeric ID from the licensing authority, linked to your National ID and biometric profile (printed on the front of your license card).'

export const SOMALIA_NATIONAL_ID_LICENSE_NOTE =
  'National ID is required to apply for or renew a Somali driver\'s license. Your license is tied to this ID.'

export function getSomaliaLicenseClass(id?: string | null): SomaliaLicenseClass | undefined {
  if (!id) return undefined
  return SOMALIA_DRIVER_LICENSE_CLASSES.find((c) => c.id === id.toUpperCase())
}

export function getSomaliaLicenseClassLabel(id?: string | null): string {
  const cls = getSomaliaLicenseClass(id)
  return cls ? `${cls.label} — ${cls.description}` : id || '—'
}

export function addYearsToDateInput(dateInput: string, years: number): string {
  if (!dateInput) return ''
  const d = new Date(`${dateInput}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  d.setFullYear(d.getFullYear() + years)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function computeSomaliaLicenseExpiry(issueDateInput: string): string {
  return addYearsToDateInput(issueDateInput, SOMALIA_LICENSE_VALIDITY_YEARS)
}
