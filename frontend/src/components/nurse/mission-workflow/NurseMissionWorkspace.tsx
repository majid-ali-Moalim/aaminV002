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
import { emergencyRequestsService, getApiErrorMessage, isApiNetworkError, nursesService } from '@/lib/api'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'
import { useNurseCases } from '@/lib/nurse/useNurseCases'
import {
  encodeAssessment,
  encodeHandover,
  encodeLoadPatient,
  isAssessmentRecord,
  isHandoverRecord,
  parseClinicalRecord,
  parseHandover,
} from '@/lib/nurse/patientCareTypes'
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
import { hasLoadPatientSaved, hasMedicalNotesSaved, driverArrivedAtHospital } from '@/lib/mission/workflowMilestones'
import {
  HandoverTaskFields,
  MedicalNotesCombinedFields,
  TaskShell,
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

const CLOSED = ['COMPLETED', 'CANCELLED']

const EMPTY_MEDICAL_NOTES: MedicalNotesFormState = {
  chiefComplaint: '',
  symptoms: '',
  consciousnessLevel: 'Alert',
  painLevel: '0',
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

function buildHandoverDefaults(mission: any, nurseName: string): HandoverFormState {
  const patient = mission.patient
  const driverName = mission.driver
    ? `${mission.driver.firstName || ''} ${mission.driver.lastName || ''}`.trim()
    : ''
  return {
    acceptedHospital: mission.destinationHospital?.name || mission.destination || '',
    rejectedEntries: [],
    patientCondition: mission.patientCondition || '',
    treatmentGiven: '',
    receivingStaff: '',
    notes: '',
    signature: '',
    ageGroup: ageGroupFromAge(patient?.age),
    gender: patient?.gender || '',
    nationalityType: patient?.nationalityType || '',
    maritalStatus: patient?.maritalStatus || '',
    driverName,
    nurseName,
  }
}

function medicalNotesFromRecords(records: any[]): MedicalNotesFormState {
  const assessmentRecord = records.find(isAssessmentRecord)
  if (!assessmentRecord) return { ...EMPTY_MEDICAL_NOTES }
  const parsed = parseClinicalRecord(assessmentRecord.clinicalNotes)
  const treatment = parseTreatmentFields(assessmentRecord.treatmentGiven)
  return {
    ...EMPTY_MEDICAL_NOTES,
    chiefComplaint: parsed?.chiefComplaint || '',
    symptoms: parsed?.symptoms || '',
    consciousnessLevel: parsed?.consciousnessLevel || 'Alert',
    painLevel: parsed?.painLevel || '0',
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
    observations: assessmentRecord.clinicalNotes?.split('\n\n').slice(1).join('\n\n') || '',
  }
}

function handoverFromRecords(records: any[], defaults: HandoverFormState): HandoverFormState {
  const handoverRecord = records.find(isHandoverRecord)
  if (!handoverRecord) return defaults
  const parsed = parseHandover(handoverRecord.clinicalNotes)
  if (!parsed) return defaults
  return {
    ...defaults,
    acceptedHospital: parsed.acceptedHospital || defaults.acceptedHospital,
    rejectedEntries: parsed.rejectedHospitals?.length ? parsed.rejectedHospitals : defaults.rejectedEntries,
    patientCondition: parsed.patientCondition || defaults.patientCondition,
    treatmentGiven: parsed.treatmentGiven || defaults.treatmentGiven,
    receivingStaff: parsed.receivingStaff || '',
    notes: parsed.notes || '',
    signature: parsed.signature || '',
    ageGroup: parsed.ageGroup || defaults.ageGroup,
    gender: parsed.gender || defaults.gender,
    nationalityType: parsed.nationalityType || defaults.nationalityType,
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
    painLevel: '0',
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
    rejectedEntries: [],
    patientCondition: '',
    treatmentGiven: '',
    receivingStaff: '',
    notes: '',
    signature: '',
    ageGroup: '',
    gender: '',
    nationalityType: '',
    maritalStatus: '',
    driverName: '',
    nurseName: '',
  })
  const [recordsError, setRecordsError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedCaseId) setMissionId(selectedCaseId)
  }, [selectedCaseId])

  const myCases = useMemo(() => cases.filter((c) => c.nurseId === nurseId), [cases, nurseId])
  const assignedPending = useMemo(
    () => myCases.filter((c) => c.status === 'ASSIGNED'),
    [myCases],
  )
  const activeCases = useMemo(() => myCases.filter((c) => !CLOSED.includes(c.status)), [myCases])

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
  const medicalNotesSaved = mission ? hasMedicalNotesSaved(caseRecords, mission.id) : false

  const handoverComplete =
    caseRecords.some(isHandoverRecord) || Boolean(meta?.completedTasks?.HOSPITAL_HANDOVER)

  const stickyPrimary = useMemo(() => workflowButtons.find((b) => b.state === 'active') ?? null, [workflowButtons])

  const guardTask = (taskId: NurseTaskId): boolean => {
    if (!mission) return false
    const reason = getNurseTaskBlockReason(taskId, mission.status)
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
        if (!patientLoaded && !medicalNotesSaved) {
          toast.error('Load the patient before medical notes.')
          return
        }
        if (!medicalNotesSaved && !guardTask('medical_notes')) return
        setMedicalNotesForm(medicalNotesFromRecords(caseRecords))
        setActiveTask('medical_notes')
        break
      case 'handover':
        if (!medicalNotesSaved) {
          toast.error('Submit medical notes before handover.')
          return
        }
        if (!driverArrivedAtHospital(mission.status)) {
          toast.error('Handover unlocks when the driver arrives at the hospital.')
          return
        }
        if (!handoverComplete && !guardTask('handover')) return
        setHandoverForm(
          handoverFromRecords(caseRecords, buildHandoverDefaults(mission, fullName || '')),
        )
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
      setActiveTask(null)
      toast.success('Patient loaded')
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
      await nursesService.createPatientCareRecord({
        emergencyRequestId: mission.id,
        nurseId,
        patientId: mission.patientId || mission.patient?.id,
        activityLabel,
        ...payload,
      })
      if (stepId) {
        markStepComplete(mission.id, stepId)
        logNurseActivity(mission.id, `${NURSE_WORKFLOW_STEPS.find((s) => s.id === stepId)?.label} saved`)
        syncWorkflow()
      }
      await loadRecords()
      toast.success('Record saved')
      return true
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save record')
      return false
    } finally {
      setSaving(false)
    }
  }

  const submitMedicalNotes = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!medicalNotesForm.chiefComplaint.trim()) {
      toast.error('Chief complaint is required')
      return
    }
    if (medicalNotesForm.treatmentType === 'Other' && !medicalNotesForm.treatmentOtherDetails.trim()) {
      toast.error('Please describe the other treatment given')
      return
    }
    const treatmentGiven =
      medicalNotesForm.treatmentType === 'Other'
        ? `Other: ${medicalNotesForm.treatmentOtherDetails.trim()}`
        : medicalNotesForm.treatmentType || undefined
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
      medicalNotesSaved ? 'Medical notes updated' : 'Medical notes saved',
    )
    if (!saved) return
    advanceTo('MEDICAL_NOTES')
    if (driverArrivedAtHospital(mission.status)) {
      setHandoverForm(buildHandoverDefaults(mission, fullName || ''))
      setActiveTask('handover')
    } else {
      setActiveTask(null)
      toast.success('Medical notes saved — handover unlocks when the driver arrives at hospital')
    }
  }

  const submitHandover = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!handoverForm.acceptedHospital.trim()) {
      toast.error('Accepted hospital is required')
      return
    }
    if (!handoverForm.receivingStaff.trim()) {
      toast.error('Receiving doctor name is required')
      return
    }
    for (const entry of handoverForm.rejectedEntries) {
      if (entry.hospitalName.trim() && !entry.reason) {
        toast.error('Select a refusal reason for each rejected hospital')
        return
      }
    }
    if (!handoverForm.signature.trim()) {
      toast.error('Signature is required')
      return
    }
    const saved = await saveRecord(
      {
        clinicalNotes: encodeHandover({
          patientCondition: handoverForm.patientCondition,
          treatmentGiven: handoverForm.treatmentGiven,
          receivingStaff: handoverForm.receivingStaff,
          notes: handoverForm.notes,
          signature: handoverForm.signature,
          acceptedHospital: handoverForm.acceptedHospital,
          rejectedHospitals: handoverForm.rejectedEntries.filter((e) => e.hospitalName.trim()),
          ageGroup: handoverForm.ageGroup,
          gender: handoverForm.gender,
          nationalityType: handoverForm.nationalityType,
          maritalStatus: handoverForm.maritalStatus,
          driverName: handoverForm.driverName,
          nurseName: handoverForm.nurseName || fullName || '',
        }),
      },
      'HOSPITAL_HANDOVER',
      handoverComplete ? 'Handover updated' : 'Hospital handover completed',
    )
    if (!saved) return
    advanceTo('HOSPITAL_HANDOVER')
    setActiveTask(null)
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
  const destinationLabel =
    mission.destination || mission.destinationHospital?.name || '—'
  const regionLabel = [mission.region?.name, mission.district?.name].filter(Boolean).join(' · ')

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
                : s.id === 'LOAD'
                  ? Stethoscope
                  : s.id === 'NOTES'
                    ? ClipboardList
                    : s.id === 'HANDOVER'
                      ? Building2
                      : CheckCircle2,
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
              title={medicalNotesSaved ? 'Edit Medical Notes' : 'Medical Notes'}
              subtitle="Assessment, vitals, observations, and treatment in one record"
              saving={saving}
              onSubmit={submitMedicalNotes}
              submitLabel={medicalNotesSaved ? 'Save & Continue to Handover' : 'Save & Continue to Handover'}
              onPrevious={() => setActiveTask(null)}
              previousLabel="Back to Actions"
              onNext={medicalNotesSaved ? () => {
                setHandoverForm(handoverFromRecords(caseRecords, buildHandoverDefaults(mission, fullName || '')))
                setActiveTask('handover')
              } : undefined}
              nextLabel="Next: Handover"
            >
              <MedicalNotesCombinedFields form={medicalNotesForm} setForm={setMedicalNotesForm} />
            </TaskShell>
          )}

          {!readOnly && activeTask === 'handover' && (
            <TaskShell
              title={handoverComplete ? 'Edit Hospital Handover' : 'Hospital Handover'}
              subtitle="Accepted and rejected hospitals, patient details, and receiving staff"
              saving={saving}
              onSubmit={submitHandover}
              submitLabel={handoverComplete ? 'Update Handover' : 'Save Handover'}
              onPrevious={() => {
                setMedicalNotesForm(medicalNotesFromRecords(caseRecords))
                setActiveTask('medical_notes')
              }}
              previousLabel="Previous: Medical Notes"
            >
              <HandoverTaskFields form={handoverForm} setForm={setHandoverForm} nurseName={fullName} />
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
