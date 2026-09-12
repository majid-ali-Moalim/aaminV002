'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  Activity,
  Building2,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  Loader2,
  MapPin,
  RefreshCw,
  Stethoscope,
  Truck,
  User,
  CheckCircle2,
} from 'lucide-react'
import { emergencyRequestsService, getApiErrorMessage, hospitalsService, isApiNetworkError, nursesService } from '@/lib/api'
import type { HospitalOption } from '@/components/hospitals/HospitalDestinationPicker'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'
import { useNurseCases } from '@/lib/nurse/useNurseCases'
import {
  encodeAssessment,
  encodeHandover,
  encodeLoadPatient,
  isAssessmentRecord,
  isHandoverRecord,
  findLatestAssessmentRecord,
  findLatestHandoverRecord,
  normalizePainLevel,
  parseClinicalRecord,
  parseHandover,
} from '@/lib/nurse/patientCareTypes'
import {
  firstMedicalNotesError,
  hasMedicalNotesErrors,
  validateMedicalNotesForm,
  type MedicalNotesFieldErrors,
} from '@/lib/nurse/medicalNotesValidation'
import {
  firstHandoverError,
  hasHandoverErrors,
  validateHandoverForm,
  sanitizeHandoverRejectedHospitals,
  type HandoverFieldErrors,
} from '@/lib/nurse/handoverValidation'
import { dispatchPatientLoadedEvent } from '@/lib/mission/patientLoadedEvents'
import { ageGroupFromAge } from '@/lib/patients/updatePatientCaseValidation'
import {
  canCloseMission,
  canDoHandover,
  getNurseTaskBlockReason,
  getNurseTransportPhaseMessage,
  logNurseActivity,
  markStepComplete,
  NURSE_TIMELINE_STEPS,
  NURSE_WORKFLOW_STEPS,
  patchNurseWorkflowMeta,
  setStoredNursePhase,
  stampNurseStage,
  markNurseCaseReviewed,
  type NurseTaskId,
  type NurseWorkflowStepId,
} from '@/lib/nurse/nurseWorkflow'
import { useNurseWorkflowState } from '@/lib/nurse/useNurseWorkflowState'
import MissionHorizontalTimeline from '@/components/mission-workflow/MissionHorizontalTimeline'
import MissionWorkflowButtons from '@/components/mission-workflow/MissionWorkflowButtons'
import {
  getNurseWaitingMessage,
  getNurseWorkflowButtons,
  NURSE_STAGE_DESCRIPTIONS,
  type NurseWorkflowButtonId,
} from '@/lib/mission/nurseWorkflowButtons'
import { getTimelineActiveIndex, getTimelineButtonStates } from '@/lib/mission/workflowTimeline'
import { hasLoadPatientSaved, hasMedicalNotesSaved } from '@/lib/mission/workflowMilestones'
import {
  HandoverQuickFields,
  MedicalNotesQuickFields,
  TaskShell,
  type HandoverCaseContext,
  type HandoverFormState,
  type MedicalNotesFormState,
} from './NurseWorkflowTasks'
import { FieldCaseDetailModal } from '@/components/shared/FieldCaseDetailModal'
import { CaseReviewPanel } from '@/components/shared/CaseReviewPanel'
import { DispatcherContactActions } from '@/components/shared/DispatcherContactActions'
import { formatSomaliaPhoneDisplay, resolvePatientPhone } from '@/lib/phoneContact'

type Props = {
  selectedCaseId?: string | null
}

import { isOccupiedMissionStatus } from '@/components/features/emergency/missionStatusOptions'

const CLOSED = ['COMPLETED', 'CANCELLED']

const EMPTY_MEDICAL_NOTES: MedicalNotesFormState = {
  chiefComplaint: '',
  symptoms: '',
  consciousnessLevel: 'Alert',
  painLevel: 'None',
  breathingStatus: 'Normal',
  injuryDescription: '',
  assessmentNotes: '',
  bloodPressure: '',
  heartRate: '',
  temperature: '',
  oxygenSaturation: '',
  respiratoryRate: '',
  observations: '',
  condition: '',
  progress: '',
  treatmentType: '',
  treatmentOtherDetails: '',
  medication: '',
  notes: '',
}

function parseTreatmentFields(treatmentGiven?: string | null) {
  if (!treatmentGiven) return { treatmentType: '', treatmentOtherDetails: '' }
  if (treatmentGiven.startsWith('Other:')) {
    return { treatmentType: 'Other', treatmentOtherDetails: treatmentGiven.slice(6).trim() }
  }
  return { treatmentType: treatmentGiven, treatmentOtherDetails: '' }
}

function treatmentSummaryFromRecords(records: any[]): string {
  const assessmentRecord = records.find(isAssessmentRecord)
  if (!assessmentRecord) return ''
  const medical = medicalNotesFromRecords(records)
  const parts: string[] = []
  if (medical.treatmentType) {
    parts.push(
      medical.treatmentType === 'Other'
        ? `Other: ${medical.treatmentOtherDetails}`
        : medical.treatmentType,
    )
  } else if (assessmentRecord.treatmentGiven) {
    parts.push(assessmentRecord.treatmentGiven)
  }
  if (medical.medication) parts.push(`Medication: ${medical.medication}`)
  if (medical.notes) parts.push(medical.notes)
  return parts.filter(Boolean).join('; ')
}

function conditionSummaryFromRecords(records: any[], mission: any): string {
  const medical = medicalNotesFromRecords(records)
  return [medical.condition, medical.observations, medical.progress, mission.patientCondition]
    .filter(Boolean)
    .join('\n\n')
}

function handoverCountryDefault(patient?: { country?: string | null; nationalityType?: string | null }) {
  if (patient?.country?.trim()) return patient.country.trim()
  if (patient?.nationalityType === 'INTERNATIONAL') return ''
  return 'Somalia'
}

function normalizeHandoverCountry(value?: string | null) {
  if (!value?.trim()) return ''
  if (value === 'LOCAL') return 'Somalia'
  if (value === 'INTERNATIONAL') return ''
  return value.trim()
}

function buildHandoverDefaults(mission: any, nurseName: string, records: any[] = []): HandoverFormState {
  const patient = mission.patient
  const driverName = mission.driver
    ? `${mission.driver.firstName || ''} ${mission.driver.lastName || ''}`.trim()
    : ''
  return {
    acceptedHospital: mission.destinationHospital?.name || mission.destination || '',
    rejectedHospitals: [],
    patientOutcome: '',
    patientCondition: conditionSummaryFromRecords(records, mission),
    treatmentGiven: treatmentSummaryFromRecords(records),
    receivingStaff: '',
    notes: '',
    signature: '',
    handoverDocumentUrl: '',
    handoverDocumentName: '',
    ageGroup: ageGroupFromAge(patient?.age),
    gender: patient?.gender || '',
    nationalityType: handoverCountryDefault(patient),
    maritalStatus: patient?.maritalStatus || '',
    driverName,
    nurseName,
  }
}

function parseMedicalNotesClinicalExtras(clinicalNotes?: string | null) {
  const empty = { observations: '', condition: '', progress: '', notes: '' }
  if (!clinicalNotes) return empty
  const parts = clinicalNotes.split('\n\n').filter(Boolean)
  const assessmentIdx = parts.findIndex((p) => p.startsWith('[EADS_ASSESSMENT]'))
  const rest = assessmentIdx >= 0 ? parts.slice(assessmentIdx + 1) : parts.slice(1)
  const treatmentPart = rest.find((p) => p.startsWith('Treatment notes:'))
  const notes = treatmentPart ? treatmentPart.replace(/^Treatment notes:\s*/, '') : ''
  const clinicalParts = rest.filter((p) => !p.startsWith('Treatment notes:'))
  const [observations = '', condition = '', progress = ''] = clinicalParts[0]?.split('\n\n') ?? []
  return { observations, condition, progress, notes }
}

function medicalNotesFromRecords(records: any[]): MedicalNotesFormState {
  const assessmentRecord = findLatestAssessmentRecord(records)
  if (!assessmentRecord) return { ...EMPTY_MEDICAL_NOTES }
  const parsed = parseClinicalRecord(assessmentRecord.clinicalNotes)
  const treatment = parseTreatmentFields(assessmentRecord.treatmentGiven)
  const extras = parseMedicalNotesClinicalExtras(assessmentRecord.clinicalNotes)
  return {
    ...EMPTY_MEDICAL_NOTES,
    chiefComplaint: parsed?.chiefComplaint || '',
    symptoms: parsed?.symptoms || '',
    consciousnessLevel: parsed?.consciousnessLevel || 'Alert',
    painLevel: parsed?.painLevel ? normalizePainLevel(parsed.painLevel) : 'None',
    breathingStatus: parsed?.breathingStatus || 'Normal',
    injuryDescription: parsed?.injuryDescription || '',
    assessmentNotes: parsed?.assessmentNotes || '',
    bloodPressure: assessmentRecord.bloodPressure || '',
    heartRate: assessmentRecord.heartRate?.toString() || '',
    temperature: assessmentRecord.temperature?.toString() || '',
    oxygenSaturation: assessmentRecord.oxygenSaturation?.toString() || '',
    respiratoryRate: assessmentRecord.respiratoryRate?.toString() || '',
    treatmentType: treatment.treatmentType,
    treatmentOtherDetails: treatment.treatmentOtherDetails,
    medication: assessmentRecord.medications || '',
    observations: extras.observations,
    condition: extras.condition,
    progress: extras.progress,
    notes: extras.notes,
  }
}

function handoverFromRecords(records: any[], defaults: HandoverFormState): HandoverFormState {
  const handoverRecord = findLatestHandoverRecord(records)
  if (!handoverRecord) return defaults
  const parsed = parseHandover(handoverRecord.clinicalNotes)
  if (!parsed) return defaults
  return {
    ...defaults,
    acceptedHospital: parsed.acceptedHospital || defaults.acceptedHospital,
    rejectedHospitals: parsed.rejectedHospitals?.length ? parsed.rejectedHospitals : defaults.rejectedHospitals,
    patientOutcome: parsed.patientOutcome || '',
    patientCondition: parsed.patientCondition || defaults.patientCondition,
    treatmentGiven: parsed.treatmentGiven || defaults.treatmentGiven,
    receivingStaff: parsed.receivingStaff || '',
    notes: parsed.notes || '',
    signature: parsed.signature || '',
    handoverDocumentUrl: parsed.handoverDocumentUrl || '',
    handoverDocumentName: parsed.handoverDocumentName || '',
    ageGroup: parsed.ageGroup || defaults.ageGroup,
    gender: parsed.gender || defaults.gender,
    nationalityType: normalizeHandoverCountry(parsed.nationalityType) || defaults.nationalityType,
    maritalStatus: parsed.maritalStatus || defaults.maritalStatus,
    driverName: parsed.driverName || defaults.driverName,
    nurseName: parsed.nurseName || defaults.nurseName,
  }
}

export default function NurseMissionWorkspace({ selectedCaseId }: Props) {
  const { nurseId, fullName, shiftStatus } = useNurseEmployee()
  const { cases, loading, reload } = useNurseCases()
  const [missionId, setMissionId] = useState<string | null>(selectedCaseId || null)
  const [records, setRecords] = useState<any[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [activeTask, setActiveTask] = useState<NurseTaskId | null>(null)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailCaseId, setDetailCaseId] = useState<string | null>(null)

  const [medicalNotesForm, setMedicalNotesForm] = useState<MedicalNotesFormState>({
    chiefComplaint: '',
    symptoms: '',
    consciousnessLevel: 'Alert',
    painLevel: 'None',
    breathingStatus: 'Normal',
    injuryDescription: '',
    assessmentNotes: '',
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    oxygenSaturation: '',
    respiratoryRate: '',
    observations: '',
    condition: '',
    progress: '',
    treatmentType: '',
    treatmentOtherDetails: '',
    medication: '',
    notes: '',
  })
  const [handoverForm, setHandoverForm] = useState<HandoverFormState>({
    acceptedHospital: '',
    rejectedHospitals: [],
    patientOutcome: '',
    patientCondition: '',
    treatmentGiven: '',
    receivingStaff: '',
    notes: '',
    signature: '',
    handoverDocumentUrl: '',
    handoverDocumentName: '',
    ageGroup: '',
    gender: '',
    nationalityType: '',
    maritalStatus: '',
    driverName: '',
    nurseName: '',
  })
  const [recordsError, setRecordsError] = useState<string | null>(null)
  const [medicalNotesErrors, setMedicalNotesErrors] = useState<MedicalNotesFieldErrors>({})
  const [medicalNotesEditing, setMedicalNotesEditing] = useState(false)
  const [handoverEditing, setHandoverEditing] = useState(false)
  const [handoverErrors, setHandoverErrors] = useState<HandoverFieldErrors>({})
  const [handoverMedicalNotesPrompt, setHandoverMedicalNotesPrompt] = useState(false)
  const [hospitals, setHospitals] = useState<HospitalOption[]>([])

  useEffect(() => {
    void hospitalsService.getAll().then((rows) => {
      setHospitals(
        (Array.isArray(rows) ? rows : [])
          .filter((h: { id?: string; name?: string }) => h.id && h.name)
          .map((h: { id: string; name: string; branches?: unknown }) => ({
            id: h.id,
            name: h.name,
            branches: h.branches,
          })),
      )
    }).catch(() => setHospitals([]))
  }, [])

  useEffect(() => {
    if (selectedCaseId) setMissionId(selectedCaseId)
  }, [selectedCaseId])

  const myCases = useMemo(() => cases.filter((c) => c.nurseId === nurseId), [cases, nurseId])
  const assignedPending = useMemo(
    () => myCases.filter((c) => c.status === 'ASSIGNED'),
    [myCases],
  )
  const activeCases = useMemo(() => myCases.filter((c) => isOccupiedMissionStatus(c.status)), [myCases])

  const mission = useMemo(() => {
    if (missionId) return myCases.find((c) => c.id === missionId) || null
    return activeCases.sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime(),
    )[0] || null
  }, [missionId, myCases, activeCases])

  useEffect(() => {
    if (mission && !missionId) setMissionId(mission.id)
  }, [mission, missionId])

  const { currentStepId, meta, syncWorkflow } = useNurseWorkflowState(mission)
  const missionClosed = currentStepId === 'MISSION_CLOSED' || (mission ? CLOSED.includes(mission.status) : false)
  const readOnly = missionClosed
  const onDuty = shiftStatus === 'ON_DUTY' || shiftStatus === 'TRANSPORTING' || shiftStatus === 'AVAILABLE'

  const loadRecords = useCallback(async () => {
    if (!nurseId) return
    setRecordsLoading(true)
    setRecordsError(null)
    try {
      const data = await nursesService.getPatientCareRecords(nurseId)
      setRecords(Array.isArray(data) ? data : [])
    } catch (err) {
      setRecords([])
      const message = getApiErrorMessage(err, 'Could not load patient care records')
      setRecordsError(message)
      if (isApiNetworkError(err)) {
        toast.error(message)
      }
    } finally {
      setRecordsLoading(false)
    }
  }, [nurseId])

  useEffect(() => {
    loadRecords()
  }, [loadRecords, mission?.id])

  const caseRecords = useMemo(
    () => records.filter((r) => r.requestId === mission?.id || r.emergencyRequest?.id === mission?.id),
    [records, mission?.id],
  )

  const caseReviewed = Boolean(meta?.reviewedAt)

  const workflowButtons = useMemo(
    () => getNurseWorkflowButtons(mission, caseRecords, readOnly, caseReviewed),
    [mission, caseRecords, readOnly, caseReviewed],
  )

  const timelineIndex = useMemo(
    () => getTimelineActiveIndex(workflowButtons),
    [workflowButtons],
  )
  const progressPct = missionClosed
    ? 100
    : Math.round(((timelineIndex + 1) / NURSE_TIMELINE_STEPS.length) * 100)

  const activeWorkflowButton = workflowButtons.find((b) => b.state === 'active') ?? null
  const nextLockedButton = workflowButtons.find((b) => b.state === 'locked') ?? null
  const stageLabel = activeWorkflowButton?.label
    ?? nextLockedButton?.label
    ?? workflowButtons.filter((b) => b.state === 'completed').at(-1)?.label
    ?? 'Waiting for driver'
  const stageDescription = activeWorkflowButton
    ? NURSE_STAGE_DESCRIPTIONS[activeWorkflowButton.id]
    : nextLockedButton?.waitReason
      ?? 'Actions unlock as the driver progresses and you complete each step.'

  const waitingMessage = useMemo(
    () => getNurseWaitingMessage(mission, workflowButtons) ?? (mission ? getNurseTransportPhaseMessage(mission.status) : null),
    [mission, workflowButtons],
  )

  const patientLoaded = mission ? hasLoadPatientSaved(caseRecords, mission.id) : false
  const medicalNotesSaved = mission
    ? hasMedicalNotesSaved(caseRecords, mission.id) || Boolean(meta?.completedTasks?.MEDICAL_NOTES)
    : false

  const handoverComplete =
    caseRecords.some(isHandoverRecord) || Boolean(meta?.completedTasks?.HOSPITAL_HANDOVER)

  const stickyPrimary = useMemo(() => workflowButtons.find((b) => b.state === 'active') ?? null, [workflowButtons])

  const goToMedicalNotesFromHandover = (edit: boolean) => {
    setMedicalNotesForm(medicalNotesFromRecords(caseRecords))
    setMedicalNotesErrors({})
    setMedicalNotesEditing(edit)
    setHandoverMedicalNotesPrompt(false)
    setHandoverEditing(false)
    setActiveTask('medical_notes')
  }

  const requestMedicalNotesFromHandover = () => {
    if (!medicalNotesSaved) {
      toast.error('Submit medical notes before handover.')
      return
    }
    setHandoverMedicalNotesPrompt(true)
  }

  const guardTask = (taskId: NurseTaskId): boolean => {
    if (!mission) return false
    const reason = getNurseTaskBlockReason(taskId, mission.status, mission.id, caseRecords)
    if (reason) {
      toast.error(reason)
      return false
    }
    return true
  }

  const refresh = async () => {
    setRefreshing(true)
    await reload(true)
    await loadRecords()
    setRefreshing(false)
  }

  const advanceTo = (next: NurseWorkflowStepId, note?: string, missionIdOverride?: string) => {
    const mid = missionIdOverride || mission?.id
    if (!mid) return
    setStoredNursePhase(mid, next)
    stampNurseStage(mid, next)
    if (note) logNurseActivity(mid, note)
    syncWorkflow()
    toast.success(`Stage: ${NURSE_WORKFLOW_STEPS.find((s) => s.id === next)?.label}`)
  }

  const detailCase = useMemo(() => {
    if (!detailCaseId) return mission
    return myCases.find((c) => c.id === detailCaseId) || mission
  }, [detailCaseId, myCases, mission])

  const openCaseDetails = (id: string) => {
    setDetailCaseId(id)
    setDetailOpen(true)
    markNurseCaseReviewed(id)
  }

  const openCase = (id: string) => {
    setMissionId(id)
    syncWorkflow()
  }

  const confirmCaseReview = () => {
    if (!mission) return
    markNurseCaseReviewed(mission.id)
    syncWorkflow()
    toast.success('Case reviewed — you can start workflow actions')
  }

  const handleWorkflowButton = async (buttonId: NurseWorkflowButtonId) => {
    if (!mission || readOnly) return
    if (!caseReviewed) {
      toast.error('Review the case details before starting workflow actions.')
      return
    }

    switch (buttonId) {
      case 'start_case':
        patchNurseWorkflowMeta(mission.id, { startCaseAt: new Date().toISOString() })
        logNurseActivity(mission.id, 'Nurse started case')
        syncWorkflow()
        toast.success('Case started')
        break
      case 'load_patient':
        if (!guardTask('load_patient')) return
        await submitLoadPatient()
        break
      case 'medical_notes':
        if (activeTask === 'handover') {
          if (!medicalNotesSaved) {
            toast.error('Submit medical notes before handover.')
            return
          }
          setHandoverMedicalNotesPrompt(true)
          return
        }
        if (!medicalNotesSaved && !guardTask('medical_notes')) return
        setMedicalNotesForm(medicalNotesFromRecords(caseRecords))
        setMedicalNotesErrors({})
        setMedicalNotesEditing(!medicalNotesSaved)
        setActiveTask('medical_notes')
        break
      case 'handover':
        if (!medicalNotesSaved) {
          toast.error('Submit medical notes before handover.')
          return
        }
        if (!handoverComplete && !guardTask('handover')) return
        setHandoverForm(
          handoverFromRecords(caseRecords, buildHandoverDefaults(mission, fullName || '', caseRecords)),
        )
        setHandoverErrors({})
        setHandoverEditing(!handoverComplete)
        setHandoverMedicalNotesPrompt(false)
        setActiveTask('handover')
        break
      case 'complete_case':
        if (!handoverComplete) {
          toast.error('Complete handover before closing the case.')
          setActiveTask('handover')
          return
        }
        await closeMission()
        break
      default:
        break
    }
  }

  const handleTask = async (taskId: NurseTaskId) => {
    if (!mission || readOnly) return

    switch (taskId) {
      case 'view_case':
      case 'review_emergency':
        openCaseDetails(mission.id)
        syncWorkflow()
        setActiveTask(null)
        logNurseActivity(mission.id, 'Case details opened')
        break
      default:
        break
    }
  }

  const submitLoadPatient = async () => {
    if (!nurseId || !mission || readOnly) return
    setSaving(true)
    try {
      await nursesService.createPatientCareRecord({
        emergencyRequestId: mission.id,
        nurseId,
        patientId: mission.patientId || mission.patient?.id,
        clinicalNotes: encodeLoadPatient(),
        activityLabel: 'Patient loaded',
      })
      markStepComplete(mission.id, 'PATIENT_LOADED')
      advanceTo('PATIENT_LOADED', 'Patient loaded into ambulance')
      await loadRecords()
      dispatchPatientLoadedEvent({ missionId: mission.id })
      setActiveTask(null)
      toast.success('Patient loaded — driver can now transfer to hospital')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not confirm patient load')
    } finally {
      setSaving(false)
    }
  }

  const saveRecord = async (
    payload: Record<string, unknown>,
    stepId?: NurseWorkflowStepId,
    activityLabel?: string,
    existingRecordId?: string,
  ): Promise<boolean> => {
    if (!nurseId || !mission || readOnly) return false
    if (stepId) {
      const taskMap: Partial<Record<NurseWorkflowStepId, NurseTaskId>> = {
        PATIENT_LOADED: 'load_patient',
        MEDICAL_NOTES: 'medical_notes',
        PATIENT_ASSESSMENT: 'medical_notes',
        HOSPITAL_HANDOVER: 'handover',
      }
      const task = taskMap[stepId]
      if (task && !guardTask(task)) return false
    }
    setSaving(true)
    try {
      const body = {
        emergencyRequestId: mission.id,
        nurseId,
        patientId: mission.patientId || mission.patient?.id,
        activityLabel,
        ...payload,
      }
      if (existingRecordId) {
        await nursesService.updatePatientCareRecord(existingRecordId, body)
      } else {
        await nursesService.createPatientCareRecord(body)
      }
      if (stepId) {
        markStepComplete(mission.id, stepId)
        logNurseActivity(mission.id, `${NURSE_WORKFLOW_STEPS.find((s) => s.id === stepId)?.label} saved`)
        syncWorkflow()
      }
      await loadRecords()
      toast.success(
        activityLabel ||
          (existingRecordId ? 'Record updated' : 'Record saved'),
      )
      return true
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save record')
      return false
    } finally {
      setSaving(false)
    }
  }

  const ensurePatientLoaded = async (): Promise<boolean> => {
    if (!nurseId || !mission) return false
    if (patientLoaded || hasLoadPatientSaved(caseRecords, mission.id)) return true
    try {
      await nursesService.createPatientCareRecord({
        emergencyRequestId: mission.id,
        nurseId,
        patientId: mission.patientId || mission.patient?.id,
        clinicalNotes: encodeLoadPatient(),
        activityLabel: 'Patient loaded',
      })
      markStepComplete(mission.id, 'PATIENT_LOADED')
      dispatchPatientLoadedEvent({ missionId: mission.id })
      await loadRecords()
      return true
    } catch {
      return false
    }
  }

  const submitMedicalNotes = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guardTask('medical_notes')) return
    const errors = validateMedicalNotesForm(medicalNotesForm)
    setMedicalNotesErrors(errors)
    if (hasMedicalNotesErrors(errors)) {
      toast.error(firstMedicalNotesError(errors) || 'Please fix the highlighted fields')
      return
    }
    await ensurePatientLoaded()
    const treatmentGiven = medicalNotesForm.treatmentType.trim() || undefined
    const noteSections = [
      encodeAssessment({
        chiefComplaint: medicalNotesForm.chiefComplaint,
        symptoms: medicalNotesForm.symptoms,
        consciousnessLevel: medicalNotesForm.consciousnessLevel,
        painLevel: medicalNotesForm.painLevel,
        breathingStatus: medicalNotesForm.breathingStatus,
        injuryDescription: medicalNotesForm.injuryDescription,
        assessmentNotes: medicalNotesForm.assessmentNotes,
      }),
      [medicalNotesForm.observations, medicalNotesForm.condition, medicalNotesForm.progress]
        .filter(Boolean)
        .join('\n\n'),
      medicalNotesForm.notes ? `Treatment notes: ${medicalNotesForm.notes}` : '',
    ].filter(Boolean)

    const existingNotesId = findLatestAssessmentRecord(caseRecords)?.id

    const saved = await saveRecord(
      {
        clinicalNotes: noteSections.join('\n\n'),
        bloodPressure: medicalNotesForm.bloodPressure || undefined,
        heartRate: medicalNotesForm.heartRate || undefined,
        temperature: medicalNotesForm.temperature || undefined,
        oxygenSaturation: medicalNotesForm.oxygenSaturation || undefined,
        respiratoryRate: medicalNotesForm.respiratoryRate || undefined,
        treatmentGiven,
        medications: medicalNotesForm.medication || undefined,
      },
      'MEDICAL_NOTES',
      existingNotesId ? 'Medical notes updated' : 'Medical notes saved',
      existingNotesId,
    )
    if (!saved) return
    setMedicalNotesErrors({})
    setMedicalNotesEditing(false)
    advanceTo('MEDICAL_NOTES')
    if (!existingNotesId) {
      setHandoverForm(buildHandoverDefaults(mission, fullName || '', caseRecords))
      setHandoverErrors({})
      setHandoverEditing(true)
      setActiveTask('handover')
    } else {
      setActiveTask(null)
      toast.success('Medical notes updated')
    }
  }

  const submitHandover = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guardTask('handover')) return
    const errors = validateHandoverForm(handoverForm, { assignedDestination })
    setHandoverErrors(errors)
    if (hasHandoverErrors(errors)) {
      toast.error(firstHandoverError(errors) || 'Please fix the highlighted fields')
      return
    }
    const existingHandoverId = findLatestHandoverRecord(caseRecords)?.id

    const saved = await saveRecord(
      {
        clinicalNotes: encodeHandover({
          patientCondition: handoverForm.patientCondition,
          treatmentGiven: handoverForm.treatmentGiven,
          receivingStaff: handoverForm.receivingStaff,
          notes: handoverForm.notes,
          signature: handoverForm.signature,
          patientOutcome: handoverForm.patientOutcome as 'Live' | 'Deceased' | 'Unknown',
          acceptedHospital:
            mission.destinationHospital?.name || mission.destination || handoverForm.acceptedHospital,
          rejectedHospitals: sanitizeHandoverRejectedHospitals(handoverForm.rejectedHospitals),
          ageGroup: handoverForm.ageGroup,
          gender: handoverForm.gender,
          nationalityType: handoverForm.nationalityType,
          maritalStatus: handoverForm.maritalStatus,
          driverName: handoverForm.driverName,
          nurseName: handoverForm.nurseName || fullName || '',
          handoverDocumentUrl: handoverForm.handoverDocumentUrl || undefined,
          handoverDocumentName: handoverForm.handoverDocumentName || undefined,
        }),
      },
      'HOSPITAL_HANDOVER',
      existingHandoverId ? 'Handover updated' : 'Hospital handover completed',
      existingHandoverId,
    )
    if (!saved) return
    setHandoverErrors({})
    setHandoverEditing(false)
    advanceTo('HOSPITAL_HANDOVER')
    setActiveTask(null)
    if (mission.status !== 'COMPLETED') {
      try {
        await emergencyRequestsService.updateStatus(mission.id, 'COMPLETED')
        advanceTo('MISSION_CLOSED', 'Case completed')
        toast.success('Handover saved — case closed')
        refresh()
      } catch {
        toast.success('Handover saved')
      }
    }
  }

  const closeMission = async () => {
    if (!mission || readOnly) return
    if (!handoverComplete) {
      toast.error('Complete the hospital handover form before closing this case')
      setActiveTask('handover')
      return
    }
    try {
      await emergencyRequestsService.updateStatus(mission.id, 'COMPLETED')
      advanceTo('MISSION_CLOSED', 'Case completed — all records saved')
      toast.success('Case closed successfully')
      refresh()
    } catch {
      toast.error('Could not close case')
    }
  }

  if (loading && !mission) {
    return (
      <div className="nurse-loading">
        <Loader2 className="animate-spin" size={28} />
        <span>Loading active case…</span>
      </div>
    )
  }

  if (!mission && assignedPending.length > 0) {
    return (
      <div className="nmw-queue">
        <div className="nmw-queue-banner">
          <HeartPulse size={18} />
          <span>{assignedPending.length} new case{assignedPending.length > 1 ? 's' : ''} from dispatch</span>
        </div>
        <div className="nmw-queue-list">
          {assignedPending.map((m) => (
            <article key={m.id} className="nmw-queue-card">
              <div className="nmw-queue-top">
                <span className="nurse-case-code">{m.trackingCode}</span>
                <span className={`nurse-priority ${m.priority?.toLowerCase()}`}>{m.priority}</span>
              </div>
              <p className="text-sm text-zinc-400">{m.patient?.fullName || m.callerName} · {m.pickupLocation}</p>
              <div className="nmw-queue-actions">
                <button type="button" className="nurse-btn ghost" onClick={() => openCaseDetails(m.id)}>
                  Review Case
                </button>
                <button type="button" className="nurse-btn primary" onClick={() => openCase(m.id)}>
                  Open Active Case
                </button>
              </div>
            </article>
          ))}
        </div>
        <FieldCaseDetailModal
          open={detailOpen}
          onClose={() => {
            setDetailOpen(false)
            setDetailCaseId(null)
          }}
          caseData={detailCase}
          variant="nurse"
        />
      </div>
    )
  }

  if (!mission) {
    return (
      <div className="nmw-empty">
        <div className="nmw-empty-icon"><Stethoscope size={32} /></div>
        <h3>No Active Case</h3>
        <p>When dispatch assigns you a case, your full clinical workflow will appear here.</p>
        <Link href="/nurse/dashboard" className="nurse-btn ghost">Back to Dashboard</Link>
        <Link href="/nurse/mission/history" className="nurse-btn ghost">Case History</Link>
      </div>
    )
  }

  const driverName = mission.driver
    ? `${mission.driver.firstName || ''} ${mission.driver.lastName || ''}`.trim()
    : '—'
  const patientPhone = resolvePatientPhone(mission)
  const assignedDestination = (mission.destinationHospital?.name || mission.destination || '').trim()
  const destinationAssigned = Boolean(assignedDestination)
  const destinationLabel = assignedDestination || 'Not assigned'
  const regionLabel = [mission.region?.name, mission.district?.name].filter(Boolean).join(' · ')
  const handoverCaseContext: HandoverCaseContext = {
    trackingCode: mission.trackingCode || '',
    patientName: mission.patient?.fullName || mission.callerName || '',
    pickupLocation: mission.pickupLocation || '',
    acceptedHospital: assignedDestination,
    priority: mission.priority || '',
    dispatcherName:
      mission.dispatcher?.user?.username ||
      [mission.dispatcher?.firstName, mission.dispatcher?.lastName].filter(Boolean).join(' ') ||
      '',
  }
  const handoverViewMode = handoverComplete && !handoverEditing

  const activityLog = [
    ...(meta?.activityLog || []).map((e) => ({
      time: format(new Date(e.time), 'HH:mm'),
      text: e.text,
    })),
  ].slice(0, 12)

  return (
    <div className={`nmw-dashboard${readOnly ? ' nmw-readonly' : ''}`}>
      {readOnly && (
        <div className="nmw-readonly-banner">
          Case completed — read-only. View all closed cases in{' '}
          <Link href="/nurse/mission/history">Case History</Link>.
        </div>
      )}
      {/* Hero */}
      <header className="nmw-hero">
        <div>
          <p className="nmw-kicker">Active Case · Live Clinical Ops</p>
          <h2 className="nmw-code">{mission.trackingCode}</h2>
          <div className="nmw-badges">
            <span className={`nurse-priority ${mission.priority?.toLowerCase()}`}>{mission.priority}</span>
            <span className="nurse-status-chip">{mission.status?.replace(/_/g, ' ')}</span>
            <span className="nmw-stage-pill">{stageLabel}</span>
          </div>
        </div>
        <div className="nmw-hero-right">
          <div className="nmw-progress-ring" style={{ ['--pct' as string]: `${progressPct}%` }}>
            <span>{progressPct}%</span>
          </div>
          <button type="button" className="nmw-refresh" onClick={refresh} aria-label="Refresh">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="nmw-progress-track">
        <div className="nmw-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Patient summary strip */}
      <div className="nmw-patient-strip">
        <span><User size={14} /> {mission.patient?.fullName || mission.callerName || 'Patient'}</span>
        <span><MapPin size={14} /> {mission.pickupLocation || '—'}</span>
        <span><Truck size={14} /> {driverName}</span>
        <span><Building2 size={14} /> {destinationLabel}</span>
      </div>

      <section className="nmw-card nmw-timeline-card nmw-span-2">
        <h3 className="nmw-card-title"><Activity size={16} /> Case Progress</h3>
        <MissionHorizontalTimeline
          classPrefix="nmw"
          steps={NURSE_TIMELINE_STEPS.map((s) => ({
            id: s.id,
            label: s.label,
            shortLabel: s.shortLabel,
            icon:
              s.id === 'START'
                ? HeartPulse
                : s.id === 'NOTES'
                  ? ClipboardList
                  : Building2,
          }))}
          activeIndex={timelineIndex}
          completed={missionClosed}
          buttonStates={getTimelineButtonStates(workflowButtons)}
          currentStepLabel={stageLabel}
          getStepTime={(i) => {
            const step = NURSE_TIMELINE_STEPS[i]
            const ts = step.stepIds.map((id) => meta?.timestamps[id]).find(Boolean)
            return ts || null
          }}
        />
      </section>

      <div className="nmw-grid nmw-grid-stage">
        {/* Current stage + actions */}
        <section className="nmw-card nmw-stage-card">
          <h3 className="nmw-card-title"><ChevronRight size={16} /> Current Stage</h3>
          <p className="nmw-stage-name">{stageLabel}</p>
          <p className="nmw-stage-desc">{stageDescription}</p>

          {!readOnly && !onDuty && (
            <p className="nmw-warn">Clock in to execute clinical workflow actions.</p>
          )}
          {!readOnly && waitingMessage && (
            <p className="nmw-warn">{waitingMessage}</p>
          )}
          {!readOnly && recordsError && (
            <p className="nmw-warn">{recordsError}</p>
          )}

          {!readOnly && !caseReviewed && (
            <CaseReviewPanel caseData={mission} variant="nurse" onConfirm={confirmCaseReview} />
          )}

          {!readOnly && caseReviewed && (
            <MissionWorkflowButtons
              buttons={workflowButtons}
              onAction={(id) => handleWorkflowButton(id as NurseWorkflowButtonId)}
              classPrefix="nmw"
              readOnly={readOnly || !onDuty}
            />
          )}

          {!readOnly && caseReviewed && (
            <button type="button" className="nurse-btn ghost w-full mt-3" onClick={() => handleTask('view_case')}>
              Review Full Case Details
            </button>
          )}

          {!readOnly && activeTask === 'medical_notes' && (
            <TaskShell
              title={medicalNotesSaved && !medicalNotesEditing ? 'Medical Notes' : medicalNotesSaved ? 'Edit Medical Notes' : 'Medical Notes'}
              subtitle={
                medicalNotesSaved && !medicalNotesEditing
                  ? 'Saved — tap Edit to update'
                  : 'Chief complaint, vitals, treatment — keep it brief'
              }
              saving={saving}
              onSubmit={
                medicalNotesSaved && !medicalNotesEditing
                  ? (e) => {
                      e.preventDefault()
                      setMedicalNotesEditing(true)
                    }
                  : submitMedicalNotes
              }
              submitLabel={
                medicalNotesSaved && !medicalNotesEditing
                  ? 'Edit'
                  : medicalNotesSaved
                    ? 'Save'
                    : 'Save notes'
              }
              submitButtonType={medicalNotesSaved && !medicalNotesEditing ? 'button' : 'submit'}
              onPrevious={() => {
                setMedicalNotesEditing(false)
                setActiveTask(null)
              }}
              previousLabel="Back to Actions"
              onNext={
                medicalNotesSaved && !medicalNotesEditing
                  ? () => {
                      setHandoverForm(
                        handoverFromRecords(
                          caseRecords,
                          buildHandoverDefaults(mission, fullName || '', caseRecords),
                        ),
                      )
                      setHandoverErrors({})
                      setHandoverEditing(false)
                      setActiveTask('handover')
                    }
                  : undefined
              }
              nextLabel="Next: Handover"
            >
              <MedicalNotesQuickFields
                form={medicalNotesForm}
                setForm={(f) => {
                  if (!medicalNotesEditing && medicalNotesSaved) return
                  setMedicalNotesForm(f)
                  if (Object.keys(medicalNotesErrors).length > 0) {
                    setMedicalNotesErrors(validateMedicalNotesForm(f))
                  }
                }}
                errors={medicalNotesErrors}
                readOnly={medicalNotesSaved && !medicalNotesEditing}
              />
            </TaskShell>
          )}

          {!readOnly && activeTask === 'handover' && (
            <TaskShell
              title={
                handoverViewMode
                  ? 'Hospital Handover'
                  : handoverComplete
                    ? 'Edit Hospital Handover'
                    : 'Hospital Handover'
              }
              subtitle={
                handoverViewMode
                  ? 'Saved — tap Edit to update'
                  : 'Quick handover — case closes when you save'
              }
              saving={saving}
              onSubmit={
                handoverViewMode
                  ? (e) => {
                      e.preventDefault()
                      setHandoverEditing(true)
                    }
                  : submitHandover
              }
              submitLabel={
                handoverViewMode ? 'Edit' : handoverComplete ? 'Save' : 'Save & close case'
              }
              submitButtonType={handoverViewMode ? 'button' : 'submit'}
              onPrevious={requestMedicalNotesFromHandover}
              previousLabel="Previous: Medical Notes"
            >
              {handoverMedicalNotesPrompt && (
                <div className="nmw-confirm-prompt span-2">
                  <p>Medical notes are already saved. Do you want to edit them, or stay on handover?</p>
                  <div className="nmw-confirm-actions">
                    <button
                      type="button"
                      className="nurse-btn primary"
                      onClick={() => goToMedicalNotesFromHandover(true)}
                    >
                      Yes, edit medical notes
                    </button>
                    <button
                      type="button"
                      className="nurse-btn ghost"
                      onClick={() => setHandoverMedicalNotesPrompt(false)}
                    >
                      No, stay on handover
                    </button>
                  </div>
                </div>
              )}
              <HandoverQuickFields
                form={handoverForm}
                setForm={(f) => {
                  if (handoverViewMode) return
                  setHandoverForm(f)
                  if (Object.keys(handoverErrors).length > 0) {
                    setHandoverErrors(validateHandoverForm(f, { assignedDestination }))
                  }
                }}
                nurseName={fullName}
                assignedDestination={assignedDestination}
                hospitals={hospitals}
                readOnly={handoverViewMode}
                errors={handoverErrors}
              />
            </TaskShell>
          )}
        </section>

        <section className="nmw-card">
          <h3 className="nmw-card-title">Active Case Summary</h3>
          <div className="nmw-info-grid">
            <NurseInfoItem label="Case ID" value={mission.trackingCode} />
            <NurseInfoItem label="Status" value={mission.status?.replace(/_/g, ' ')} />
            <NurseInfoItem label="Priority" value={mission.priority} />
            <NurseInfoItem label="Patient" value={mission.patient?.fullName || mission.callerName} />
            <NurseInfoItem label="Phone" value={formatSomaliaPhoneDisplay(patientPhone)} />
            <NurseInfoItem label="Pickup" value={mission.pickupLocation} />
            <NurseInfoItem label="Destination" value={destinationLabel} />
            <NurseInfoItem label="Region" value={regionLabel} />
            <NurseInfoItem label="Driver" value={driverName !== '—' ? driverName : undefined} />
            <NurseInfoItem label="Ambulance" value={mission.ambulance?.ambulanceNumber} />
            <NurseInfoItem label="Dispatcher" value={mission.dispatcher?.user?.username || mission.dispatcher?.firstName} />
          </div>
          <div className="nmw-info-contact">
            <DispatcherContactActions
              dispatcher={mission.dispatcher}
              caseId={mission.id}
              trackingCode={mission.trackingCode}
              portal="nurse"
              variant="nurse"
              layout="stack"
            />
          </div>
          <button type="button" className="nurse-btn ghost w-full mt-3" onClick={() => openCaseDetails(mission.id)}>
            Open full case details
          </button>
        </section>
      </div>

        {/* Activity log — moved outside grid */}
        <section className="nmw-card nmw-span-2">
          <h3 className="nmw-card-title">Activity Log</h3>
          {activityLog.length === 0 ? (
            <p className="nurse-empty-inline">Workflow activity will appear here.</p>
          ) : (
            <ul className="nmw-activity-list">
              {activityLog.map((e, i) => (
                <li key={i}><span>{e.time}</span> {e.text}</li>
              ))}
            </ul>
          )}
        </section>

      {activeCases.length > 1 && (
        <div className="nmw-case-switcher">
          <span className="text-xs text-zinc-500">Switch case:</span>
          {activeCases.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`nmw-case-chip${c.id === mission.id ? ' active' : ''}`}
              onClick={() => { setMissionId(c.id); setActiveTask(null) }}
            >
              {c.trackingCode}
            </button>
          ))}
        </div>
      )}

      {!readOnly && stickyPrimary && (
        <div className="nmw-sticky-action">
          <button
            type="button"
            className="nmw-sticky-btn secondary"
            onClick={() => handleTask('review_emergency')}
            aria-label="Review case details"
          >
            <ClipboardList size={18} />
          </button>
          <button
            type="button"
            className="nmw-sticky-btn primary"
            disabled={!onDuty || !caseReviewed}
            onClick={() => handleWorkflowButton(stickyPrimary.id as NurseWorkflowButtonId)}
          >
            {stickyPrimary.label}
          </button>
        </div>
      )}

      <FieldCaseDetailModal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setDetailCaseId(null)
        }}
        caseData={detailCase}
        variant="nurse"
      />
    </div>
  )
}

function NurseInfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="nmw-info-item">
      <span className="nmw-info-label">{label}</span>
      <span className="nmw-info-value">{value || '—'}</span>
    </div>
  )
}
