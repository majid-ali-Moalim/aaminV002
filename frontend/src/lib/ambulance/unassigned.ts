import type { Ambulance } from '@/types'

export function isUnassignedAmbulance(ambulance: Ambulance): boolean {
  return !(ambulance.employees?.length ?? 0)
}

export function filterUnassignedAmbulances(ambulances: Ambulance[]): Ambulance[] {
  return (Array.isArray(ambulances) ? ambulances : []).filter(
    (a) => a.isActive !== false && isUnassignedAmbulance(a),
  )
}
