import type { EmergencyRequest } from '@/types'
import { ACTIVE_MISSION_STATUSES } from '@/components/features/emergency/missionStatusOptions'

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

/** Simplified timing aligned with Start → Complete workflow (no en-route / on-scene rows). */
export function buildCaseTimingRows(request: EmergencyRequest): CaseTimingRow[] {
  const created = request.createdAt
  const assigned = request.assignedAt
  const started = request.dispatchedAt || assigned
  const completed = request.completedAt || request.cancelledAt
  const inProgress = ACTIVE_MISSION_STATUSES.includes(request.status)

  const assignMinutes = minutesBetween(created, assigned)
  const missionEnd = completed ?? (inProgress && started ? new Date().toISOString() : null)
  const missionMinutes = minutesBetween(started, missionEnd)

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
      durationLabel: assignMinutes != null ? 'Time to assign crew' : null,
      durationMinutes: assignMinutes,
    },
    {
      key: 'started',
      label: 'Case started',
      timestamp: started,
      durationLabel: null,
      durationMinutes: null,
      highlight: true,
    },
    {
      key: 'completed',
      label: request.status === 'CANCELLED' ? 'Case cancelled' : 'Case completed',
      timestamp: completed,
      durationLabel: missionMinutes != null ? 'Active mission time' : null,
      durationMinutes: missionMinutes,
      highlight: true,
    },
  ]
}

export function caseTimingSummary(request: EmergencyRequest) {
  const rows = buildCaseTimingRows(request)
  const started = request.dispatchedAt || request.assignedAt
  const completed = request.completedAt || request.cancelledAt
  const inProgress = ACTIVE_MISSION_STATUSES.includes(request.status)
  const missionEnd = completed ?? (inProgress && started ? new Date().toISOString() : null)

  return {
    rows,
    assignMinutes: rows.find((r) => r.key === 'assigned')?.durationMinutes ?? null,
    missionMinutes: minutesBetween(started, missionEnd),
    totalMinutes: minutesBetween(request.createdAt, completed),
  }
}

/** @deprecated Use buildCaseTimingRows — kept for imports that expect granular rows */
export function buildGranularCaseTimingRows(request: EmergencyRequest): CaseTimingRow[] {
  return buildCaseTimingRows(request)
}
