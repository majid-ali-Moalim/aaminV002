import { emergencyRequestsService } from '@/lib/api'
import { dispatcherDashboardApi } from '@/lib/dispatcherApi'
import type { Ambulance, EmergencyRequest, Employee } from '@/types'
import { caseRequiresNurse } from '@/lib/emergency/caseNurseRequirement'
import { getCaseStationLabels } from '@/lib/emergency/caseStationLabels'

type DispatchCrewMember = Employee & {
  dispatchAssignable?: boolean
  dispatchEligible?: boolean
  exclusionReason?: string
  shiftStatus?: string
}

function isAssignableCrewMember(member: DispatchCrewMember): boolean {
  if (member.dispatchAssignable === false || member.dispatchEligible === false) return false
  if (member.exclusionReason === 'on_case') return false
  const shift = String(member.shiftStatus ?? '').toUpperCase()
  if (shift && shift !== 'AVAILABLE') return false
  return true
}

export type AutoAssignResult = {
  ambulanceNumber: string
  driverName: string
  nurseName?: string
}

export async function autoAssignAvailableCrew(
  request: EmergencyRequest,
  options: { isDispatcherPortal: boolean },
): Promise<AutoAssignResult> {
  const { stationId: caseStationId } = getCaseStationLabels(request)
  const nurseRequired = caseRequiresNurse(request)

  let ambulances: Ambulance[] = []
  let drivers: DispatchCrewMember[] = []
  let nurses: DispatchCrewMember[] = []

  if (options.isDispatcherPortal) {
    const regional = await dispatcherDashboardApi.getAssignableResources(request.id)
    ambulances = regional.ambulances ?? []
    drivers = (regional.drivers ?? []).filter(isAssignableCrewMember)
    nurses = (regional.nurses ?? []).filter(isAssignableCrewMember)
  } else {
    const stationId = caseStationId ?? undefined
    const [ambulancesRes, driversRes, nursesRes] = await Promise.all([
      emergencyRequestsService.getAvailableAmbulances(request.id, stationId),
      emergencyRequestsService.getAvailableDrivers(request.id, stationId),
      emergencyRequestsService.getAvailableNurses(request.id, stationId),
    ])
    ambulances = Array.isArray(ambulancesRes) ? ambulancesRes : []
    drivers = (Array.isArray(driversRes) ? driversRes : (driversRes?.drivers ?? [])).filter(
      isAssignableCrewMember,
    )
    nurses = (Array.isArray(nursesRes) ? nursesRes : (nursesRes?.nurses ?? [])).filter(
      isAssignableCrewMember,
    )
  }

  const ambulance = ambulances[0]
  const driver = drivers[0]
  const nurse = nurses[0]

  if (!ambulance) {
    throw new Error('No available ambulance at this station.')
  }
  if (!driver) {
    throw new Error('No available driver at this station.')
  }
  if (nurseRequired && !nurse) {
    throw new Error('This case requires a nurse, but none are available at this station.')
  }

  await emergencyRequestsService.assignAmbulance(
    request.id,
    ambulance.id,
    driver.id,
    nurse?.id,
  )

  return {
    ambulanceNumber: ambulance.ambulanceNumber ?? ambulance.id,
    driverName: [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim() || 'Driver',
    nurseName: nurse
      ? [nurse.firstName, nurse.lastName].filter(Boolean).join(' ').trim()
      : undefined,
  }
}
