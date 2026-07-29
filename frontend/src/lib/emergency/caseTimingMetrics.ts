import type { EmergencyRequest } from '@/types'

export type CaseTimingRow = {
  key: string
  label: string
  timestamp: string | null
  durationLabel: string | null
  durationMinutes: number | null
  highlight?: boolean
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function minutesBetween(from?: string | null, to?: string | null): number | null {
  const start = parseDate(from)
  const end = parseDate(to)
  if (!start || !end) return null
  const diff = Math.round((end.getTime() - start.getTime()) / 60000)
  return diff >= 0 ? diff : null
}

export function formatDurationMinutes(minutes: number | null | undefined): string {
  if (minutes == null || minutes < 0) return '—'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function buildCaseTimingRows(request: EmergencyRequest): CaseTimingRow[] {
  const created = request.createdAt
  const assigned = request.assignedAt
  const dispatched = request.dispatchedAt
  const arrivedScene = request.arrivedAtSceneAt
  const departedScene = request.departedSceneAt
  const arrivedHospital = request.arrivedDestinationAt
  const completed = request.completedAt
  const cancelled = request.cancelledAt

  const waitingStart = created
  const waitingEnd = assigned || dispatched
  const waitingMinutes = minutesBetween(waitingStart, waitingEnd)

  const responseStart = dispatched || assigned || created
  const responseMinutes =
    request.responseMinutes ?? minutesBetween(responseStart, arrivedScene)

  const transportStart = departedScene || arrivedScene
  const transportMinutes = minutesBetween(transportStart, arrivedHospital)

  const sceneMinutes = minutesBetween(arrivedScene, departedScene)

  const totalEnd = completed || cancelled
  const totalMinutes =
    request.serviceMinutes ?? minutesBetween(created, totalEnd)

  const dispatchMinutes = minutesBetween(assigned || created, dispatched)

  return [
    {
      key: 'request',
      label: 'Request received',
      timestamp: created,
      durationLabel: null,
      durationMinutes: null,
    },
    {
      key: 'assigned',
      label: 'Crew assigned',
      timestamp: assigned,
      durationLabel: waitingMinutes != null ? 'Queue / waiting time' : null,
      durationMinutes: waitingMinutes,
    },
    {
      key: 'dispatched',
      label: 'Dispatched (en route)',
      timestamp: dispatched,
      durationLabel: dispatchMinutes != null ? 'Dispatch time' : null,
      durationMinutes: dispatchMinutes,
    },
    {
      key: 'arrived-scene',
      label: 'Arrived at patient',
      timestamp: arrivedScene,
      durationLabel: responseMinutes != null ? 'Time to reach patient' : null,
      durationMinutes: responseMinutes,
      highlight: true,
    },
    {
      key: 'departed-scene',
      label: 'Departed scene',
      timestamp: departedScene,
      durationLabel: sceneMinutes != null ? 'Time on scene' : null,
      durationMinutes: sceneMinutes,
    },
    {
      key: 'arrived-hospital',
      label: 'Arrived at hospital',
      timestamp: arrivedHospital,
      durationLabel: transportMinutes != null ? 'Time to reach hospital' : null,
      durationMinutes: transportMinutes,
      highlight: true,
    },
    {
      key: 'completed',
      label: request.status === 'CANCELLED' ? 'Case cancelled' : 'Case completed',
      timestamp: completed || cancelled,
      durationLabel: totalMinutes != null ? 'Total case time' : null,
      durationMinutes: totalMinutes,
      highlight: true,
    },
  ]
}

export function caseTimingSummary(request: EmergencyRequest) {
  const rows = buildCaseTimingRows(request)
  return {
    rows,
    waitingMinutes: rows.find((r) => r.key === 'assigned')?.durationMinutes ?? null,
    responseMinutes: rows.find((r) => r.key === 'arrived-scene')?.durationMinutes ?? null,
    transportMinutes: rows.find((r) => r.key === 'arrived-hospital')?.durationMinutes ?? null,
    totalMinutes: rows.find((r) => r.key === 'completed')?.durationMinutes ?? null,
  }
}
