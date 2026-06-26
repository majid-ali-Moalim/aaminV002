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

export const DRAFT_KEY = 'aamin-hire-ambulance-draft'

export const EMERGENCY_HOTLINE = '999'
