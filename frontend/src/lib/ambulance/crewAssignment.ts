import type { Ambulance, Employee } from '@/types'

/** Staff not currently assigned to any ambulance — use when picking crew for an ambulance. */
export function filterUnassignedCrew(staff: Employee[]): Employee[] {
  return (Array.isArray(staff) ? staff : []).filter((member) => !member.assignedAmbulanceId)
}

function roleMatches(employee: Employee, hint: 'DRIVER' | 'NURSE'): boolean {
  return employee.employeeRole?.name?.toUpperCase().includes(hint) ?? false
}

function isActiveAmbulance(ambulance: Ambulance): boolean {
  return ambulance.isActive !== false
}

/** Ambulances with no driver assigned, plus the staff member's current ambulance (for change/remove). */
export function getDriverAssignableAmbulances(
  ambulances: Ambulance[],
  currentAmbulanceId?: string | null,
): Ambulance[] {
  return (Array.isArray(ambulances) ? ambulances : []).filter((ambulance) => {
    if (!isActiveAmbulance(ambulance)) return false
    if (currentAmbulanceId && ambulance.id === currentAmbulanceId) return true
    const crew = ambulance.employees ?? []
    return !crew.some((member) => roleMatches(member, 'DRIVER'))
  })
}

/** Ambulances with no nurse assigned, plus the staff member's current ambulance (for change/remove). */
export function getNurseAssignableAmbulances(
  ambulances: Ambulance[],
  currentAmbulanceId?: string | null,
): Ambulance[] {
  return (Array.isArray(ambulances) ? ambulances : []).filter((ambulance) => {
    if (!isActiveAmbulance(ambulance)) return false
    if (currentAmbulanceId && ambulance.id === currentAmbulanceId) return true
    const crew = ambulance.employees ?? []
    return !crew.some((member) => roleMatches(member, 'NURSE'))
  })
}
