import type { CareRecord } from '@/lib/mission/workflowMilestones'
import {
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

/** Three visible steps — load patient & case close run automatically in the background. */
const BUTTONS: { id: NurseWorkflowButtonId; label: string }[] = [
  { id: 'start_case', label: 'Start Case' },
  { id: 'medical_notes', label: 'Medical Notes' },
  { id: 'handover', label: 'Handover' },
]

function waitReasonFor(
  id: NurseWorkflowButtonId,
  ctx: {
    started: boolean
    loaded: boolean
    notesSaved: boolean
    handoverDone: boolean
  },
): string {
  switch (id) {
    case 'start_case':
      return 'Review the case first'
    case 'medical_notes':
      if (!ctx.started) return 'Start the case first'
      return 'Waiting for driver to start the case'
    case 'handover':
      if (!ctx.started) return 'Start the case first'
      if (!ctx.notesSaved) return 'Submit medical notes first'
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
    load_patient: false,
    medical_notes: started && mission.status !== 'ASSIGNED' && !notesSaved,
    handover: started && notesSaved && !handoverDone,
    complete_case: false,
  }

  const ctx = { started, loaded, notesSaved, handoverDone }

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
  start_case: 'Confirm you are ready — then record medical notes.',
  load_patient: '',
  medical_notes: 'Quick assessment and vitals — save while en route if needed.',
  handover: 'Brief handover at hospital — case closes automatically when saved.',
  complete_case: '',
}
