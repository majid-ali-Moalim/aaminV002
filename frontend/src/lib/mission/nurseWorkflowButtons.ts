import type { CareRecord } from '@/lib/mission/workflowMilestones'
import {
  driverArrivedAtHospital,
  driverArrivedAtPatient,
  hasHandoverSaved,
  hasLoadPatientSaved,
  hasMedicalNotesSaved,
} from '@/lib/mission/workflowMilestones'
import { getNurseWorkflowMeta } from '@/lib/nurse/nurseWorkflow'

export type NurseWorkflowButtonId = 'load_patient' | 'medical_notes' | 'handover' | 'complete_case'

export type WorkflowButtonState = 'completed' | 'active' | 'locked'

export type NurseWorkflowButton = {
  id: NurseWorkflowButtonId
  label: string
  state: WorkflowButtonState
  waitReason?: string
  editable?: boolean
}

const BUTTONS: { id: NurseWorkflowButtonId; label: string }[] = [
  { id: 'load_patient', label: 'Load Patient' },
  { id: 'medical_notes', label: 'Medical Notes' },
  { id: 'handover', label: 'Handover Patient' },
  { id: 'complete_case', label: 'Complete Case' },
]

export function getNurseWorkflowButtons(
  mission: { id: string; status: string } | null,
  careRecords: CareRecord[],
  readOnly: boolean,
): NurseWorkflowButton[] {
  if (!mission || readOnly) {
    return BUTTONS.map((b) => ({ ...b, state: 'completed' as const }))
  }

  const meta = getNurseWorkflowMeta(mission.id)
  const status = mission.status
  const loaded = hasLoadPatientSaved(careRecords, mission.id) || Boolean(meta.completedTasks?.PATIENT_LOADED)
  const notesSaved = hasMedicalNotesSaved(careRecords, mission.id) || Boolean(meta.completedTasks?.MEDICAL_NOTES)
  const handoverDone =
    hasHandoverSaved(careRecords, mission.id) || Boolean(meta.completedTasks?.HOSPITAL_HANDOVER)

  const done = (id: NurseWorkflowButtonId) => {
    switch (id) {
      case 'load_patient':
        return loaded
      case 'medical_notes':
        return notesSaved
      case 'handover':
        return handoverDone
      case 'complete_case':
        return status === 'COMPLETED'
      default:
        return false
    }
  }

  const canLoad = driverArrivedAtPatient(status) && !loaded
  const canNotes = loaded && !notesSaved
  const canHandover = driverArrivedAtHospital(status) && !handoverDone
  const canComplete = handoverDone && driverArrivedAtHospital(status) && status !== 'COMPLETED'

  const activeId: NurseWorkflowButtonId | null = canLoad
    ? 'load_patient'
    : canNotes
      ? 'medical_notes'
      : canHandover
        ? 'handover'
        : canComplete
          ? 'complete_case'
          : null

  return BUTTONS.map((b) => {
    if (done(b.id)) {
      const editable = b.id === 'medical_notes' || b.id === 'handover'
      let label = b.label
      if (b.id === 'medical_notes' && notesSaved) label = 'Edit Notes'
      if (b.id === 'handover' && handoverDone) label = 'Edit Handover'
      return { ...b, label, state: 'completed', editable }
    }

    if (activeId === b.id) return { ...b, state: 'active' }

    let waitReason = 'Waiting for driver…'
    if (b.id === 'load_patient') {
      waitReason = 'Waiting for driver to arrive at patient'
    } else if (b.id === 'medical_notes') {
      waitReason = 'Complete Load Patient first'
    } else if (b.id === 'handover') {
      waitReason = 'Waiting for driver to arrive at hospital'
    } else if (b.id === 'complete_case') {
      waitReason = 'Complete handover first'
    }

    return { ...b, state: 'locked', waitReason }
  })
}

export function getNurseWaitingMessage(
  mission: { status: string } | null,
  buttons: NurseWorkflowButton[],
): string | null {
  if (!mission || mission.status === 'COMPLETED') return null
  if (buttons.every((b) => b.state === 'locked')) return 'Waiting for driver…'
  return null
}
