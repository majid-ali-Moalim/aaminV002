import {
  User,
  HeartPulse,
  MapPin,
  Globe,
  ClipboardCheck,
  Siren,
  Clock,
} from 'lucide-react'

import { API_BASE_URL } from '@/lib/api'

export const API_BASE = API_BASE_URL

/** Fixed emergency types for the public quick-submit form (< 30 seconds). */
export const EMERGENCY_TYPE_OPTIONS = [
  { value: 'road_accident', label: 'Road Accident' },
  { value: 'chest_pain', label: 'Chest Pain' },
  { value: 'difficulty_breathing', label: 'Difficulty Breathing' },
  { value: 'unconscious', label: 'Unconscious Person' },
  { value: 'pregnancy', label: 'Pregnancy Emergency' },
  { value: 'fire_burn', label: 'Fire/Burn' },
  { value: 'violence_injury', label: 'Violence/Injury' },
  { value: 'stroke', label: 'Stroke' },
  { value: 'other', label: 'Other' },
] as const

/** Quick-pick booking times for non-emergency requests. */
export const BOOKING_TIME_SLOTS = [
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' },
] as const

export const STEPS = [
  { id: 'emergency', label: 'Emergency', icon: Siren },
  { id: 'request', label: 'Request', icon: User },
  { id: 'location', label: 'Location', icon: MapPin },
] as const

export type StepId = (typeof STEPS)[number]['id']

export const REQUEST_TYPES = [
  {
    value: 'EMERGENCY',
    label: 'Emergency',
    desc: 'Life-threatening — immediate dispatch',
    icon: Siren,
    accent: 'border-red-500 bg-red-50 ring-red-500',
  },
  {
    value: 'NON_EMERGENCY',
    label: 'Non-Emergency',
    desc: 'Scheduled or non-critical transport',
    icon: Clock,
    accent: 'border-blue-500 bg-blue-50 ring-blue-500',
  },
] as const

export const TRANSPORT_TYPES = [
  { value: 'HOSPITAL_APPOINTMENT', label: 'Hospital Appointment' },
  { value: 'HOSPITAL_DISCHARGE', label: 'Hospital Discharge' },
  { value: 'INTER_HOSPITAL_TRANSFER', label: 'Inter-Hospital Transfer' },
  { value: 'ROUTINE_MEDICAL', label: 'Routine Medical Transport' },
  { value: 'FUNERAL', label: 'Funeral / Deceased Person Transport' },
  { value: 'OTHER', label: 'Other' },
] as const

export type TransportTypeValue = (typeof TRANSPORT_TYPES)[number]['value']

export const HOSPITAL_TRANSPORT_TYPES: TransportTypeValue[] = [
  'HOSPITAL_APPOINTMENT',
  'HOSPITAL_DISCHARGE',
  'INTER_HOSPITAL_TRANSFER',
  'ROUTINE_MEDICAL',
]

export const AGE_GROUPS = [
  { value: 'INFANT', label: 'Infant (0ΓÇô1 year)', age: 0 },
  { value: 'TODDLER', label: 'Toddler (2ΓÇô5 years)', age: 3 },
  { value: 'CHILD', label: 'Child (6ΓÇô12 years)', age: 9 },
  { value: 'TEENAGER', label: 'Teenager (13ΓÇô17 years)', age: 15 },
  { value: 'YOUNG_ADULT', label: 'Young Adult (18ΓÇô35 years)', age: 26 },
  { value: 'ADULT', label: 'Adult (36ΓÇô59 years)', age: 45 },
  { value: 'SENIOR', label: 'Senior (60+ years)', age: 65 },
] as const

export type AgeGroupValue = (typeof AGE_GROUPS)[number]['value']

export const BLEEDING_STATUSES = [
  { value: 'NONE', label: 'No Bleeding' },
  { value: 'MINOR', label: 'Minor Bleeding' },
  { value: 'SEVERE', label: 'Severe Bleeding' },
  { value: 'HEAVY_UNCONTROLLED', label: 'Heavy Uncontrolled Bleeding' },
] as const

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'] as const

export const DRAFT_KEY = 'aamin-hire-ambulance-draft'
export const LANG_KEY = 'aamin-hire-ambulance-lang'

export const EMERGENCY_HOTLINE = '999'
