import type { Region } from '@/types'
import type {
  DispatchCreateDraft,
  DispatchRequestType,
  EmergencyDispatchForm,
  NonEmergencyDispatchForm,
  ReferralDispatchForm,
} from '@/components/features/emergency/dispatch-create/types'

export const DISPATCH_NON_EMERGENCY_TRANSPORT_TYPES = [
  { value: 'FUNERAL', label: 'Funeral / Deceased Person Transport' },
  { value: 'HOSPITAL_DISCHARGE', label: 'Hospital Discharge' },
  { value: 'HOSPITAL_APPOINTMENT', label: 'Hospital Appointment' },
  { value: 'OTHER', label: 'Other' },
] as const

export function isFuneralTransport(transportType: string): boolean {
  return transportType === 'FUNERAL'
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

export function getBookingDateTimeBounds(within24Hours: boolean): { min: string; max?: string } {
  const now = new Date()
  const min = now.toISOString().slice(0, 16)
  if (!within24Hours) return { min }
  return {
    min,
    max: new Date(now.getTime() + TWENTY_FOUR_HOURS_MS).toISOString().slice(0, 16),
  }
}

export function isBookingWithin24Hours(bookingDateTime: string): boolean {
  const booking = new Date(bookingDateTime)
  if (Number.isNaN(booking.getTime())) return false
  const now = Date.now()
  return booking.getTime() >= now - 60_000 && booking.getTime() <= now + TWENTY_FOUR_HOURS_MS
}

export type SharedDispatchContact = {
  patientName: string
  phone: string
  regionId: string
  districtId: string
  stationId: string
  locationHint: string
  needsNurse: boolean | null
}

export const defaultSharedDispatchContact = (): SharedDispatchContact => ({
  patientName: '',
  phone: '',
  regionId: '',
  districtId: '',
  stationId: '',
  locationHint: '',
  needsNurse: null,
})

export function findBanadirRegionId(regions: Region[]): string {
  const match = regions.find((r) => {
    const name = (r.name || '').toLowerCase()
    return name.includes('banadir') || name.includes('banaadir') || name.includes('mogadishu')
  })
  return match?.id ?? ''
}

export function findBanadirRegionName(regions: Region[]): string {
  const match = regions.find((r) => r.id === findBanadirRegionId(regions))
  return match?.name ?? 'Banaadir'
}

export function extractSharedContactFromDraft(draft: DispatchCreateDraft): SharedDispatchContact {
  const type = draft.requestType
  if (type === 'EMERGENCY') {
    const f = draft.emergency
    return {
      patientName: f.patientName,
      phone: f.phone,
      regionId: f.regionId,
      districtId: f.districtId,
      stationId: f.stationId,
      locationHint: f.areaStreet,
      needsNurse: f.needsNurse,
    }
  }
  if (type === 'NON_EMERGENCY') {
    const f = draft.nonEmergency
    return {
      patientName: f.patientName,
      phone: f.phone,
      regionId: f.regionId,
      districtId: f.districtId,
      stationId: f.stationId,
      locationHint: f.pickupAddress,
      needsNurse: f.needsNurse,
    }
  }
  if (type === 'REFERRAL') {
    const f = draft.referral
    return {
      patientName: f.patientName,
      phone: f.phone,
      regionId: f.regionId,
      districtId: f.districtId,
      stationId: f.stationId,
      locationHint: '',
      needsNurse: f.needsNurse,
    }
  }
  return defaultSharedDispatchContact()
}

export function applySharedContactToDraft(
  draft: DispatchCreateDraft,
  shared: SharedDispatchContact,
  targetType: DispatchRequestType,
): DispatchCreateDraft {
  const base = {
    patientName: shared.patientName,
    phone: shared.phone,
    regionId: shared.regionId,
    districtId: shared.districtId,
    stationId: shared.stationId,
  }

  if (targetType === 'EMERGENCY') {
    const emergency: EmergencyDispatchForm = {
      ...draft.emergency,
      ...base,
      areaStreet: shared.locationHint || draft.emergency.areaStreet,
      needsNurse: true,
    }
    return { ...draft, emergency }
  }

  if (targetType === 'NON_EMERGENCY') {
    const nonEmergency: NonEmergencyDispatchForm = {
      ...draft.nonEmergency,
      ...base,
      pickupAddress: shared.locationHint || draft.nonEmergency.pickupAddress,
      needsNurse: shared.needsNurse ?? draft.nonEmergency.needsNurse,
    }
    return { ...draft, nonEmergency }
  }

  const referral: ReferralDispatchForm = {
    ...draft.referral,
    ...base,
    needsNurse: shared.needsNurse ?? draft.referral.needsNurse,
  }
  return { ...draft, referral }
}

export function applySharedToAllForms(
  draft: DispatchCreateDraft,
  shared: SharedDispatchContact,
): DispatchCreateDraft {
  let next = draft
  next = applySharedContactToDraft(next, shared, 'EMERGENCY')
  next = applySharedContactToDraft(next, shared, 'NON_EMERGENCY')
  next = applySharedContactToDraft(next, shared, 'REFERRAL')
  return next
}

export function withBanadirRegionDefaults(
  draft: DispatchCreateDraft,
  banadirRegionId: string,
): DispatchCreateDraft {
  if (!banadirRegionId) return draft
  const patchRegion = (regionId: string) => regionId || banadirRegionId
  return {
    ...draft,
    emergency: { ...draft.emergency, regionId: patchRegion(draft.emergency.regionId) },
    nonEmergency: { ...draft.nonEmergency, regionId: patchRegion(draft.nonEmergency.regionId) },
    referral: { ...draft.referral, regionId: patchRegion(draft.referral.regionId) },
    sharedContact: draft.sharedContact
      ? { ...draft.sharedContact, regionId: patchRegion(draft.sharedContact.regionId) }
      : draft.sharedContact,
  }
}
