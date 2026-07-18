import type { DriverMission } from '@/lib/stores/driverStore'
import type { CareRecord } from '@/lib/mission/workflowMilestones'
import {
  driverArrivedAtHospital,
  driverArrivedAtPatient,
  driverTransporting,
  hasMedicalNotesSaved,
} from '@/lib/mission/workflowMilestones'
import { getWorkflowMeta, markDriverMilestoneComplete, type WorkflowStageMeta } from '@/lib/driver/missionWorkflow'

export type DriverWorkflowButtonId =
  | 'start_case'
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
  { id: 'going_to_patient', label: 'Going to Patient' },
  { id: 'arrived_at_patient', label: 'Arrived at Patient' },
  { id: 'going_to_hospital', label: 'Going to Hospital' },
  { id: 'arrived_at_hospital', label: 'Arrived at Hospital' },
]

function milestoneDone(
  meta: WorkflowStageMeta,
  id: DriverWorkflowButtonId,
  mission: DriverMission,
): boolean {
  if (meta.completedMilestones?.[id]) return true
  const status = mission.status
  switch (id) {
    case 'start_case':
      return status !== 'ASSIGNED'
    case 'going_to_patient':
      return meta.completedMilestones?.going_to_patient === true || driverArrivedAtPatient(status)
    case 'arrived_at_patient':
      return driverArrivedAtPatient(status) || driverTransporting(status)
    case 'going_to_hospital':
      return driverTransporting(status)
    case 'arrived_at_hospital':
      return driverArrivedAtHospital(status)
    default:
      return false
  }
}

export function getDriverWorkflowButtons(
  mission: DriverMission | null,
  careRecords: CareRecord[],
  readOnly: boolean,
): DriverWorkflowButton[] {
  if (!mission || readOnly) {
    return BUTTONS.map((b) => ({ ...b, state: 'completed' as const }))
  }

  const meta = getWorkflowMeta(mission.id)
  const notesSaved = hasMedicalNotesSaved(careRecords, mission.id)

  const done = (id: DriverWorkflowButtonId) => milestoneDone(meta, id, mission)

  const canStartCase = mission.status === 'ASSIGNED' && !done('start_case')
  const canGoToPatient = done('start_case') && !done('going_to_patient')
  const canArrivePatient =
    done('going_to_patient') && !done('arrived_at_patient') && !driverArrivedAtPatient(mission.status)
  const canGoHospital =
    done('arrived_at_patient') &&
    !done('going_to_hospital') &&
    notesSaved &&
    !driverTransporting(mission.status)
  const canArriveHospital =
    done('going_to_hospital') && !done('arrived_at_hospital') && mission.status === 'TRANSPORTING'

  const activeId: DriverWorkflowButtonId | null = canStartCase
    ? 'start_case'
    : canGoToPatient
      ? 'going_to_patient'
      : canArrivePatient
        ? 'arrived_at_patient'
        : canGoHospital
          ? 'going_to_hospital'
          : canArriveHospital
            ? 'arrived_at_hospital'
            : null

  return BUTTONS.map((b) => {
    if (done(b.id)) {
      return { ...b, state: 'completed', editable: true }
    }
    if (activeId === b.id) return { ...b, state: 'active' }

    let waitReason = 'Waiting for previous step'
    if (b.id === 'going_to_hospital' && done('arrived_at_patient') && !notesSaved) {
      waitReason = 'Waiting for nurse medical notes'
    }

    return { ...b, state: 'locked', waitReason }
  })
}

export { markDriverMilestoneComplete as markDriverMilestone }
