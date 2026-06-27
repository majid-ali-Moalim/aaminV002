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

export const STEPS = [
  { id: 'urgency', label: 'Urgency', icon: Siren },
  { id: 'identity', label: 'Identity', icon: User },
  { id: 'patient', label: 'Patient', icon: HeartPulse },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'details', label: 'Details', icon: Globe },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
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
  { value: 'INFANT', label: 'Infant (0–1 year)', age: 0 },
  { value: 'TODDLER', label: 'Toddler (2–5 years)', age: 3 },
  { value: 'CHILD', label: 'Child (6–12 years)', age: 9 },
  { value: 'TEENAGER', label: 'Teenager (13–17 years)', age: 15 },
  { value: 'YOUNG_ADULT', label: 'Young Adult (18–35 years)', age: 26 },
  { value: 'ADULT', label: 'Adult (36–59 years)', age: 45 },
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
