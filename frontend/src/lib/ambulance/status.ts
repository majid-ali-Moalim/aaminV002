import type { AmbulanceStatus } from '@/types'

/** Admin-settable statuses (manual updates). ON_DUTY is set by dispatch/missions. */
export const ADMIN_AMBULANCE_STATUS_OPTIONS: { value: AmbulanceStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'UNAVAILABLE', label: 'Unavailable' },
]

export function isAmbulanceAvailable(status: string): boolean {
  return status === 'AVAILABLE'
}

export function isAmbulanceUnavailable(status: string): boolean {
  return status !== 'AVAILABLE'
}

export function getAmbulanceStatusLabel(status: string): string {
  if (status === 'AVAILABLE') return 'Available'
  if (status === 'ON_DUTY') return 'Unavailable (On Duty)'
  return 'Unavailable'
}

export function getAdminAmbulanceStatusValue(status: string): AmbulanceStatus {
  return status === 'AVAILABLE' ? 'AVAILABLE' : 'UNAVAILABLE'
}

export function getAmbulanceStatusStyles(status: string): {
  badge: string
  header: string
  label: string
} {
  if (status === 'AVAILABLE') {
    return {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      header: 'from-emerald-600 to-emerald-700',
      label: 'Available',
    }
  }
  if (status === 'ON_DUTY') {
    return {
      badge: 'bg-slate-100 text-slate-800 border-slate-200',
      header: 'from-slate-600 to-slate-800',
      label: 'Unavailable (On Duty)',
    }
  }
  return {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    header: 'from-slate-600 to-slate-800',
    label: 'Unavailable',
  }
}
