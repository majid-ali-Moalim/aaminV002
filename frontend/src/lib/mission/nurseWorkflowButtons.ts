import type { CareRecord } from '@/lib/mission/workflowMilestones'
import {
  driverArrivedAtHospital,
  driverArrivedAtPatient,
  hasHandoverSaved,
  hasLoadPatientSaved,
  hasMedicalNotesSaved,
} from '@/lib/mission/workflowMilestones'
import { getNurseWorkflowMeta } from '@/lib/nurse/nurseWorkflow'

export type NurseWorkflowButtonId =
  | 'start_case'
  | 'load_patient'
  | 'medical_notes'
  | 'handover'
  | 'complete_case'

export type WorkflowButtonState = 'completed' | 'active' | 'locked'

export type NurseWorkflowButton = {
  id: NurseWorkflowButtonId
  label: string
  state: WorkflowButtonState
  waitReason?: string
  editable?: boolean
}

const BUTTONS: { id: NurseWorkflowButtonId; label: string }[] = [
  { id: 'start_case', label: 'Start Case' },
  { id: 'load_patient', label: 'Loaded the Patient' },
  { id: 'medical_notes', label: 'Medical Notes' },
  { id: 'handover', label: 'Patient Handover' },
  { id: 'complete_case', label: 'Complete Case' },
]

function waitReasonFor(
  id: NurseWorkflowButtonId,
  ctx: {
    started: boolean
    loaded: boolean
    notesSaved: boolean
    handoverDone: boolean
    atHospital: boolean
  },
): string {
  switch (id) {
    case 'start_case':
      return 'Review the case first'
    case 'load_patient':
      return ctx.started ? 'Waiting for driver to arrive at patient' : 'Start the case first'
    case 'medical_notes':
      return 'Load the patient first'
    case 'handover':
      if (!ctx.notesSaved) return 'Submit medical notes first'
      if (!ctx.atHospital) return 'Waiting for driver to arrive at hospital'
      return 'Complete the previous step first'
    case 'complete_case':
      if (!ctx.handoverDone) return 'Complete handover first'
      if (!ctx.atHospital) return 'Waiting for driver to arrive at hospital'
      return 'Complete the previous step first'
    default:
      return 'Complete the previous step first'
  }
}

export function getNurseWorkflowButtons(
  mission: { id: string; status: string } | null,
  careRecords: CareRecord[],
  readOnly: boolean,
  caseReviewed = true,
): NurseWorkflowButton[] {
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

  const meta = getNurseWorkflowMeta(mission.id)
  const status = mission.status
  const started = Boolean(meta.startCaseAt)
  const loaded = hasLoadPatientSaved(careRecords, mission.id) || Boolean(meta.completedTasks?.PATIENT_LOADED)
  const notesSaved = hasMedicalNotesSaved(careRecords, mission.id) || Boolean(meta.completedTasks?.MEDICAL_NOTES)
  const handoverDone =
    hasHandoverSaved(careRecords, mission.id) || Boolean(meta.completedTasks?.HOSPITAL_HANDOVER)
  const atHospital = driverArrivedAtHospital(status)

  const done = (id: NurseWorkflowButtonId) => {
    switch (id) {
      case 'start_case':
        return started
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

  const canActivate: Record<NurseWorkflowButtonId, boolean> = {
    start_case: !started,
    load_patient: started && driverArrivedAtPatient(status) && !loaded,
    // Can run in parallel with driver transfer to hospital — no transport status required.
    medical_notes: loaded && !notesSaved,
    handover: notesSaved && !handoverDone && atHospital,
    complete_case: handoverDone && atHospital && status !== 'COMPLETED',
  }

  const ctx = { started, loaded, notesSaved, handoverDone, atHospital }

  return BUTTONS.map((b) => {
    if (done(b.id)) {
      const editable = b.id === 'medical_notes' || b.id === 'handover'
      let label = b.label
      if (b.id === 'medical_notes' && notesSaved) label = 'Edit Medical Notes'
      if (b.id === 'handover' && handoverDone) label = 'Edit Handover'
      return { ...b, label, state: 'completed', editable }
    }

    if (canActivate[b.id]) return { ...b, state: 'active' }

    return {
      ...b,
      state: 'locked',
      waitReason: waitReasonFor(b.id, ctx),
    }
  })
}

export function getNurseWaitingMessage(
  mission: { status: string } | null,
  buttons: NurseWorkflowButton[],
): string | null {
  if (!mission || mission.status === 'COMPLETED') return null
  const actives = buttons.filter((b) => b.state === 'active')
  if (actives.length > 0) return null
  if (buttons.every((b) => b.state === 'locked')) {
    const waiting = buttons.find((b) => b.waitReason?.includes('driver'))
    return waiting?.waitReason || buttons[0]?.waitReason || 'Waiting for driver…'
  }
  return null
}

export const NURSE_STAGE_DESCRIPTIONS: Record<NurseWorkflowButtonId, string> = {
  start_case: 'Review the case and confirm you are ready to begin clinical care.',
  load_patient: 'Confirm the patient is loaded once the driver arrives on scene.',
  medical_notes: 'Record assessment, vitals, and observations — can be done while en route to hospital.',
  handover: 'Transfer patient information to receiving hospital staff after the driver arrives.',
  complete_case: 'Close the case after handover and hospital arrival.',
}
