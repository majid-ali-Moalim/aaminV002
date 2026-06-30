import type { LucideIcon } from 'lucide-react'
import {
  Truck,
  Stethoscope,
  Siren,
  BarChart2,
  Users,
  Lock,
  Building2,
  Radio,
  HeartPulse,
  Settings,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  driver: Truck,
  nurse: Stethoscope,
  case: Siren,
  dispatch: Radio,
  report: BarChart2,
  hospital: Building2,
  employee: Users,
  patient: HeartPulse,
  ambulance: Truck,
  system: Settings,
  role: Lock,
  permission: Lock,
  access: Lock,
  audit: Lock,
  security: Lock,
  station: Building2,
}

export function iconForPermissionKey(key: string): LucideIcon {
  return ICONS[key.split('.')[0]] ?? Lock
}
