import {
  User,
  HeartPulse,
  MapPin,
  Globe,
  ClipboardCheck,
  Siren,
  Activity,
  Baby,
  Bone,
  HelpCircle,
  Clock,
} from 'lucide-react'

export const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export const STEPS = [
  { id: 'urgency', label: 'Urgency', icon: Siren },
  { id: 'identity', label: 'Identity', icon: User },
  { id: 'patient', label: 'Patient', icon: HeartPulse },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'details', label: 'Details', icon: Globe },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
] as const

export type StepId = (typeof STEPS)[number]['id']

export const EMERGENCY_TYPES = [
  { value: 'ACCIDENT', label: 'Road Accident', icon: Activity, color: 'from-orange-500 to-red-600' },
  { value: 'CARDIAC', label: 'Heart / Cardiac', icon: HeartPulse, color: 'from-red-500 to-rose-600' },
  { value: 'TRAUMA', label: 'Injury / Trauma', icon: Bone, color: 'from-amber-500 to-orange-600' },
  { value: 'PREGNANCY', label: 'Pregnancy', icon: Baby, color: 'from-pink-500 to-rose-600' },
  { value: 'OTHER', label: 'Other Emergency', icon: HelpCircle, color: 'from-slate-500 to-slate-700' },
] as const

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

export const COUNTRIES = [
  'USA', 'UK', 'Kenya', 'Ethiopia', 'Djibouti', 'Uganda', 'UAE', 'Saudi Arabia', 'Other',
]

export const DRAFT_KEY = 'aamin-hire-ambulance-draft'

export const EMERGENCY_HOTLINE = '999'
