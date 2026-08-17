import type { DriverMission } from '@/lib/stores/driverStore'
import type { CareRecord } from '@/lib/mission/workflowMilestones'
import { getWorkflowMeta, markDriverMilestoneComplete, type WorkflowStageMeta } from '@/lib/driver/missionWorkflow'

export type DriverWorkflowButtonId = 'start_case' | 'case_complete'

/** @deprecated Legacy milestone ids — kept for session meta compatibility */
export type DriverLegacyMilestoneId =
  | 'going_to_patient'
  | 'arrived_at_patient'
  | 'going_to_hospital'
  | 'arrived_at_hospital'

export type WorkflowButtonState = 'completed' | 'active' | 'locked'

export type DriverWorkflowButton = {
  id: DriverWorkflowButtonId
  label: string
  state: WorkflowButtonState
  waitReason?: string
  editable?: boolean
}

const BUTTONS: { id: DriverWorkflowButtonId; label: string }[] = [
  { id: 'start_case', label: 'Start Case' },
  { id: 'case_complete', label: 'Case Complete' },
]

function caseStarted(meta: WorkflowStageMeta, mission: DriverMission): boolean {
  if (meta.completedMilestones?.start_case) return true
  return mission.status !== 'ASSIGNED'
}

export function getDriverWorkflowButtons(
  mission: DriverMission | null,
  _careRecords: CareRecord[],
  readOnly: boolean,
  caseReviewed = true,
): DriverWorkflowButton[] {
  if (!mission || readOnly) {
    return BUTTONS.map((b) => ({ ...b, state: 'completed' as const }))
  }

  if (!caseReviewed) {
    return BUTTONS.map((b) => ({
      ...b,
      state: 'locked' as const,
      waitReason: 'Review the case details first',
    }))
  }

  const meta = getWorkflowMeta(mission.id)
  const started = caseStarted(meta, mission)
  const closed = mission.status === 'COMPLETED' || mission.status === 'CANCELLED'

  return BUTTONS.map((b) => {
    if (b.id === 'start_case') {
      if (started) return { ...b, state: 'completed' }
      return { ...b, state: 'active' }
    }

    // case_complete
    if (closed) return { ...b, state: 'completed' }
    if (started) {
      return {
        ...b,
        state: 'locked',
        waitReason: 'Waiting for nurse to complete medical notes and handover',
      }
    }
    return {
      ...b,
      state: 'locked',
      waitReason: 'Start the case first',
    }
  })
}

export { markDriverMilestoneComplete as markDriverMilestone }

/** Mark all transport milestones so legacy checks stay satisfied. */
export function markDriverRunStarted(missionId: string) {
  const milestones: Array<'start_case' | DriverLegacyMilestoneId> = [
    'start_case',
    'going_to_patient',
    'arrived_at_patient',
    'going_to_hospital',
    'arrived_at_hospital',
  ]
  for (const m of milestones) {
    markDriverMilestoneComplete(missionId, m)
  }
}

export const DRIVER_STAGE_DESCRIPTIONS: Record<DriverWorkflowButtonId, string> = {
  start_case: 'Begin the run — nurse handles notes and handover.',
  case_complete: 'Case closes when the nurse saves handover.',
}
