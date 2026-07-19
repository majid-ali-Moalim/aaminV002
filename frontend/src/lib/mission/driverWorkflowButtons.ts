import type { DriverMission } from '@/lib/stores/driverStore'
import type { CareRecord } from '@/lib/mission/workflowMilestones'
import {
  driverArrivedAtHospital,
  driverArrivedAtPatient,
  driverTransporting,
  hasLoadPatientSaved,
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
  { id: 'going_to_patient', label: 'To Patient' },
  { id: 'arrived_at_patient', label: 'Arrived at Patient' },
  { id: 'going_to_hospital', label: 'Transfer to Hospital' },
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

function waitReasonFor(id: DriverWorkflowButtonId, patientLoaded: boolean, arrivedAtPatient: boolean): string {
  if (id === 'going_to_hospital' && arrivedAtPatient && !patientLoaded) {
    return 'Waiting for nurse to load the patient'
  }
  return 'Complete the previous step first'
}

export function getDriverWorkflowButtons(
  mission: DriverMission | null,
  careRecords: CareRecord[],
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
  const patientLoaded = hasLoadPatientSaved(careRecords, mission.id)
  const arrivedAtPatient = driverArrivedAtPatient(mission.status)

  const done = (id: DriverWorkflowButtonId) => milestoneDone(meta, id, mission)

  const canActivate: Record<DriverWorkflowButtonId, boolean> = {
    start_case: mission.status === 'ASSIGNED' && !done('start_case'),
    going_to_patient: done('start_case') && !done('going_to_patient'),
    arrived_at_patient:
      done('going_to_patient') && !done('arrived_at_patient') && !arrivedAtPatient,
    // Independent of nurse medical notes — only needs patient loaded.
    going_to_hospital:
      done('arrived_at_patient') &&
      !done('going_to_hospital') &&
      patientLoaded &&
      !driverTransporting(mission.status),
    arrived_at_hospital:
      done('going_to_hospital') && !done('arrived_at_hospital') && mission.status === 'TRANSPORTING',
  }

  return BUTTONS.map((b) => {
    if (done(b.id)) {
      return { ...b, state: 'completed', editable: true }
    }
    if (canActivate[b.id]) return { ...b, state: 'active' }
    return {
      ...b,
      state: 'locked',
      waitReason: waitReasonFor(b.id, patientLoaded, arrivedAtPatient),
    }
  })
}

export { markDriverMilestoneComplete as markDriverMilestone }

export const DRIVER_STAGE_DESCRIPTIONS: Record<DriverWorkflowButtonId, string> = {
  start_case: 'Review the case and begin the run when ready.',
  going_to_patient: 'Navigate to the patient location.',
  arrived_at_patient: 'Confirm arrival on scene — nurse loads the patient.',
  going_to_hospital: 'Start transport after the nurse loads the patient. Nurse can complete medical notes en route.',
  arrived_at_hospital: 'Confirm arrival at the hospital destination.',
}
