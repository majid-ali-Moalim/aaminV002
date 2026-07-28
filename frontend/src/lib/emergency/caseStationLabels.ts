import type { EmergencyRequest } from '@/types'

export function getCaseStationLabels(request: EmergencyRequest) {
  const latestTransfer = request.caseTransfers?.[0]
  const assignedStation =
    request.station?.name ?? latestTransfer?.toStation?.name ?? null
  const transferredFromStation = latestTransfer?.fromStation?.name ?? null

  return {
    assignedStation,
    transferredFromStation,
    stationId: request.stationId ?? request.station?.id ?? latestTransfer?.toStation?.id ?? null,
  }
}

export function resourceBelongsToStation(
  resource: {
    stationId?: string | null
    station?: { id: string } | null
    assignedAmbulance?: { stationId?: string | null } | null
  },
  stationId: string,
) {
  return (
    resource.stationId === stationId ||
    resource.station?.id === stationId ||
    resource.assignedAmbulance?.stationId === stationId
  )
}
