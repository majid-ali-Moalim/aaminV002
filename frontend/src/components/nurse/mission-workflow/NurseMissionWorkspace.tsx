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
} from 'lucide-react'
import { emergencyRequestsService, nursesService } from '@/lib/api'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'
import { useNurseCases } from '@/lib/nurse/useNurseCases'
import {
  encodeAssessment,
  encodeHandover,
  encodeMonitoring,
  isAssessmentRecord,
  isHandoverRecord,
  isMedicalNoteRecord,
  isMonitoringRecord,
  parseClinicalRecord,
  TREATMENT_TYPES,
} from '@/lib/nurse/patientCareTypes'
import {
  canStartPatientCare,
  canDoPatientCareTasks,
  canDoTreatmentMonitoring,
  canDoHandover,
  canCloseMission,
  getNurseTimelineIndex,
  getNurseTaskBlockReason,
  getNurseTransportPhaseMessage,
  getNextStepId,
  logNurseActivity,
  markStepComplete,
  NURSE_TIMELINE_STEPS,
  NURSE_WORKFLOW_STEPS,
  patchNurseWorkflowMeta,
  setStoredNursePhase,
  stampNurseStage,
  markNurseCaseReviewed,
  getNurseWorkflowMeta,
  type NurseTaskId,
  type NurseWorkflowStepId,
} from '@/lib/nurse/nurseWorkflow'
import { useNurseWorkflowState } from '@/lib/nurse/useNurseWorkflowState'
import {
  AssessmentTaskFields,
  HandoverTaskFields,
  MonitoringTaskFields,
  NotesTaskFields,
  TaskShell,
  TreatmentTaskFields,
  VitalsTaskFields,
  type AssessmentFormState,
  type HandoverFormState,
  type MonitoringFormState,
  type NotesFormState,
  type TreatmentFormState,
  type VitalsFormState,
} from './NurseWorkflowTasks'

type Props = {
  selectedCaseId?: string | null
}

const CLOSED = ['COMPLETED', 'CANCELLED']

export default function NurseMissionWorkspace({ selectedCaseId }: Props) {
  const { nurseId, fullName, shiftStatus } = useNurseEmployee()
  const { cases, loading, reload } = useNurseCases()
  const [missionId, setMissionId] = useState<string | null>(selectedCaseId || null)
  const [records, setRecords] = useState<any[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [activeTask, setActiveTask] = useState<NurseTaskId | null>(null)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [assessmentForm, setAssessmentForm] = useState<AssessmentFormState>({
    chiefComplaint: '',
    symptoms: '',
    consciousnessLevel: 'Alert',
    painLevel: '0',
    breathingStatus: 'Normal',
    injuryDescription: '',
    assessmentNotes: '',
  })
  const [vitalsForm, setVitalsForm] = useState<VitalsFormState>({
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    oxygenSaturation: '',
    respiratoryRate: '',
  })
  const [notesForm, setNotesForm] = useState<NotesFormState>({ observations: '', condition: '', progress: '' })
  const [treatmentForm, setTreatmentForm] = useState<TreatmentFormState>({
    treatmentType: TREATMENT_TYPES[0],
    medication: '',
    notes: '',
  })
  const [monitoringForm, setMonitoringForm] = useState<MonitoringFormState>({
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    oxygenSaturation: '',
    respiratoryRate: '',
    condition: '',
    notes: '',
  })
  const [handoverForm, setHandoverForm] = useState<HandoverFormState>({
    patientCondition: '',
    treatmentGiven: '',
    receivingStaff: '',
    notes: '',
    signature: '',
  })

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
  const currentStep = NURSE_WORKFLOW_STEPS.find((s) => s.id === currentStepId) ?? NURSE_WORKFLOW_STEPS[0]
  const missionClosed = currentStepId === 'MISSION_CLOSED' || (mission ? CLOSED.includes(mission.status) : false)
  const timelineIndex = getNurseTimelineIndex(currentStepId)
  const progressPct = missionClosed
    ? 100
    : Math.round(((timelineIndex + 1) / NURSE_TIMELINE_STEPS.length) * 100)
  const missionAccepted = Boolean(meta?.acceptedAt)
  const caseReviewed = Boolean(meta?.reviewedAt)
  const readOnly = missionClosed
  const onScene = mission ? canStartPatientCare(mission.status) : false
  const phaseMessage = mission ? getNurseTransportPhaseMessage(mission.status) : null
  const onDuty = shiftStatus === 'ON_DUTY' || shiftStatus === 'TRANSPORTING' || shiftStatus === 'AVAILABLE'

  const guardTask = (taskId: NurseTaskId): boolean => {
    if (!mission) return false
    const reason = getNurseTaskBlockReason(taskId, mission.status)
    if (reason) {
      toast.error(reason)
      return false
    }
    return true
  }

  const stageActions = useMemo(() => {
    if (currentStepId === 'MISSION_ASSIGNED' && missionAccepted) {
      return [
        { id: 'review_emergency' as NurseTaskId, label: 'Review Case Details', variant: 'secondary' as const },
        {
          id: 'begin_care' as NurseTaskId,
          label: onScene ? 'Start Patient Care' : 'Waiting for crew on scene',
          variant: 'primary' as const,
        },
      ]
    }
    if (currentStepId === 'MISSION_ASSIGNED' && !missionAccepted) {
      return currentStep.actions
    }
    return currentStep.actions
  }, [currentStepId, currentStep.actions, missionAccepted, onScene])

  const stickyPrimary = useMemo(() => {
    return stageActions.find((a) => a.variant === 'primary') ?? stageActions[0] ?? null
  }, [stageActions])

  const stickyPrimaryDisabled =
    stickyPrimary &&
    ((stickyPrimary.id === 'accept' && !caseReviewed) ||
      (stickyPrimary.id === 'begin_care' && !onScene))

  const visibleTaskChips = useMemo((): [NurseTaskId, string, typeof Stethoscope][] => {
    if (!mission || !missionAccepted) return []
    const status = mission.status
    const chips: [NurseTaskId, string, typeof Stethoscope][] = []
    if (canDoPatientCareTasks(status)) {
      chips.push(['assessment', 'Assessment', Stethoscope])
      chips.push(['vitals', 'Vital Signs', Activity])
      chips.push(['notes', 'Medical Notes', ClipboardList])
    }
    if (canDoTreatmentMonitoring(status)) {
      chips.push(['treatment', 'Treatment', HeartPulse])
      chips.push(['monitoring', 'Monitoring', Activity])
    }
    if (canDoHandover(status)) {
      chips.push(['handover', 'Handover', Building2])
      chips.push(['documentation', 'Documentation', ClipboardList])
    }
    return chips
  }, [mission, missionAccepted])

  const loadRecords = useCallback(async () => {
    if (!nurseId) return
    setRecordsLoading(true)
    try {
      const data = await nursesService.getPatientCareRecords(nurseId)
      setRecords(Array.isArray(data) ? data : [])
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

  const docSummary = useMemo(() => ({
    assessments: caseRecords.filter(isAssessmentRecord).length,
    vitals: caseRecords.filter((r) => r.bloodPressure || r.heartRate || r.temperature).length,
    notes: caseRecords.filter(isMedicalNoteRecord).length,
    treatments: caseRecords.filter((r) => r.treatmentGiven && !isAssessmentRecord(r)).length,
    monitoring: caseRecords.filter(isMonitoringRecord).length,
    handovers: caseRecords.filter(isHandoverRecord).length,
  }), [caseRecords])

  const handoverComplete =
    docSummary.handovers > 0 || Boolean(meta?.completedTasks?.HOSPITAL_HANDOVER)

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

  const acceptMission = async (id: string) => {
    if (!onDuty) {
      toast.error('Clock in under Shift & Attendance to accept missions')
      return
    }
    if (!getNurseWorkflowMeta(id).reviewedAt) {
      toast.error('Review case details before accepting')
      return
    }
    if (!nurseId) return
    try {
      await nursesService.acceptMission(id, nurseId)
      setMissionId(id)
      setStoredNursePhase(id, 'MISSION_ASSIGNED')
      patchNurseWorkflowMeta(id, { acceptedAt: new Date().toISOString() })
      stampNurseStage(id, 'MISSION_ASSIGNED')
      logNurseActivity(id, 'Mission accepted by nurse')
      syncWorkflow()
      toast.success('Mission accepted')
      refresh()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not accept mission')
    }
  }

  const handleTask = async (taskId: NurseTaskId) => {
    if (!mission || readOnly) return

    switch (taskId) {
      case 'view_case':
        markNurseCaseReviewed(mission.id)
        syncWorkflow()
        setActiveTask(null)
        toast.success('Case reviewed — you may now accept the mission')
        break
      case 'accept':
        if (!caseReviewed) {
          toast.error('Review case details before accepting')
          return
        }
        acceptMission(mission.id)
        break
      case 'review_emergency':
        markNurseCaseReviewed(mission.id)
        syncWorkflow()
        setActiveTask(null)
        logNurseActivity(mission.id, 'Case details reviewed')
        toast.success('Case reviewed — you may now accept the mission')
        break
      case 'begin_care':
        if (!guardTask('begin_care')) return
        advanceTo('PATIENT_ASSESSMENT', 'Patient care started')
        setActiveTask('assessment')
        break
      case 'assessment':
        if (!guardTask('assessment')) return
        setActiveTask('assessment')
        break
      case 'vitals':
        if (!guardTask('vitals')) return
        setActiveTask('vitals')
        break
      case 'notes':
        if (!guardTask('notes')) return
        setActiveTask('notes')
        break
      case 'treatment':
        if (!guardTask('treatment')) return
        setActiveTask('treatment')
        break
      case 'monitoring':
        if (!guardTask('monitoring')) return
        setActiveTask('monitoring')
        break
      case 'handover':
        if (!guardTask('handover')) return
        setActiveTask('handover')
        break
      case 'documentation':
        if (!guardTask('documentation')) return
        setActiveTask('documentation')
        break
      case 'close_mission':
        if (!handoverComplete) {
          toast.error('Complete the hospital handover form before closing this case')
          setActiveTask('handover')
          return
        }
        if (!mission || !canCloseMission(mission.status)) {
          toast.error('Mission can only be closed after the driver arrives at the hospital.')
          return
        }
        await closeMission()
        break
      case 'advance': {
        const next = getNextStepId(currentStepId)
        if (next) {
          advanceTo(next)
          const stepTask = NURSE_WORKFLOW_STEPS.find((s) => s.id === next)?.primaryTask
          if (stepTask && stepTask !== 'advance') setActiveTask(stepTask)
        }
        break
      }
      default:
        break
    }
  }

  const saveRecord = async (
    payload: Record<string, unknown>,
    stepId?: NurseWorkflowStepId,
    activityLabel?: string,
  ) => {
    if (!nurseId || !mission || readOnly) return
    if (stepId) {
      const taskMap: Partial<Record<NurseWorkflowStepId, NurseTaskId>> = {
        PATIENT_ASSESSMENT: 'assessment',
        VITAL_SIGNS: 'vitals',
        MEDICAL_NOTES: 'notes',
        TREATMENT: 'treatment',
        PATIENT_MONITORING: 'monitoring',
        HOSPITAL_HANDOVER: 'handover',
        COMPLETE_DOCUMENTATION: 'documentation',
      }
      const task = taskMap[stepId]
      if (task && !guardTask(task)) return
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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save record')
    } finally {
      setSaving(false)
    }
  }

  const submitAssessment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assessmentForm.chiefComplaint.trim()) {
      toast.error('Chief complaint is required')
      return
    }
    await saveRecord({ clinicalNotes: encodeAssessment(assessmentForm) }, 'PATIENT_ASSESSMENT', 'Patient assessment recorded')
    advanceTo('VITAL_SIGNS')
    setActiveTask('vitals')
  }

  const submitVitals = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveRecord(
      {
        bloodPressure: vitalsForm.bloodPressure || undefined,
        heartRate: vitalsForm.heartRate || undefined,
        temperature: vitalsForm.temperature || undefined,
        oxygenSaturation: vitalsForm.oxygenSaturation || undefined,
        respiratoryRate: vitalsForm.respiratoryRate || undefined,
      },
      'VITAL_SIGNS',
      'Vital signs recorded',
    )
    advanceTo('MEDICAL_NOTES')
    setVitalsForm({ bloodPressure: '', heartRate: '', temperature: '', oxygenSaturation: '', respiratoryRate: '' })
  }

  const submitNotes = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = [notesForm.observations, notesForm.condition, notesForm.progress].filter(Boolean).join('\n\n')
    if (!text.trim()) {
      toast.error('Enter at least one note field')
      return
    }
    await saveRecord({ clinicalNotes: text }, 'MEDICAL_NOTES', 'Medical notes added')
    setNotesForm({ observations: '', condition: '', progress: '' })
  }

  const submitTreatment = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveRecord(
      {
        treatmentGiven: treatmentForm.treatmentType,
        medications: treatmentForm.medication || undefined,
        clinicalNotes: treatmentForm.notes || undefined,
      },
      'TREATMENT',
      `Treatment recorded: ${treatmentForm.treatmentType}`,
    )
    setTreatmentForm({ treatmentType: TREATMENT_TYPES[0], medication: '', notes: '' })
  }

  const submitMonitoring = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveRecord(
      {
        bloodPressure: monitoringForm.bloodPressure || undefined,
        heartRate: monitoringForm.heartRate || undefined,
        temperature: monitoringForm.temperature || undefined,
        oxygenSaturation: monitoringForm.oxygenSaturation || undefined,
        respiratoryRate: monitoringForm.respiratoryRate || undefined,
        clinicalNotes: encodeMonitoring({
          bloodPressure: monitoringForm.bloodPressure,
          heartRate: monitoringForm.heartRate,
          temperature: monitoringForm.temperature,
          oxygenSaturation: monitoringForm.oxygenSaturation,
          respiratoryRate: monitoringForm.respiratoryRate,
          condition: monitoringForm.condition,
          notes: monitoringForm.notes,
        }),
      },
      'PATIENT_MONITORING',
      'Patient monitoring updated',
    )
    setMonitoringForm({
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      oxygenSaturation: '',
      respiratoryRate: '',
      condition: '',
      notes: '',
    })
  }

  const submitHandover = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!handoverForm.signature.trim()) {
      toast.error('Signature is required')
      return
    }
    await saveRecord({ clinicalNotes: encodeHandover(handoverForm) }, 'HOSPITAL_HANDOVER', 'Hospital handover completed')
    advanceTo('COMPLETE_DOCUMENTATION')
    setActiveTask('documentation')
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
      advanceTo('MISSION_CLOSED', 'Mission completed — all records saved')
      toast.success('Mission closed successfully')
      refresh()
    } catch {
      toast.error('Could not close mission')
    }
  }

  if (loading && !mission) {
    return (
      <div className="nurse-loading">
        <Loader2 className="animate-spin" size={28} />
        <span>Loading mission workspace…</span>
      </div>
    )
  }

  if (!mission && assignedPending.length > 0) {
    return (
      <div className="nmw-queue">
        <div className="nmw-queue-banner">
          <HeartPulse size={18} />
          <span>{assignedPending.length} mission{assignedPending.length > 1 ? 's' : ''} awaiting acceptance</span>
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
                <button
                  type="button"
                  className="nurse-btn ghost"
                  onClick={() => {
                    markNurseCaseReviewed(m.id)
                    setMissionId(m.id)
                    toast.success('Case reviewed — you may now accept')
                  }}
                >
                  Review Case
                </button>
                <button
                  type="button"
                  className="nurse-btn primary"
                  disabled={!getNurseWorkflowMeta(m.id).reviewedAt}
                  onClick={() => acceptMission(m.id)}
                >
                  Accept Mission
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    )
  }

  if (!mission) {
    return (
      <div className="nmw-empty">
        <div className="nmw-empty-icon"><Stethoscope size={32} /></div>
        <h3>No Active Mission</h3>
        <p>When dispatch assigns you a case, your full clinical workflow will appear here.</p>
        <Link href="/nurse/shifts" className="nurse-btn ghost">Shift & Attendance</Link>
        <Link href="/nurse/mission/history" className="nurse-btn ghost">Case History</Link>
      </div>
    )
  }

  const driverName = mission.driver
    ? `${mission.driver.firstName || ''} ${mission.driver.lastName || ''}`.trim()
    : '—'

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
          <p className="nmw-kicker">Case Workspace · Live Clinical Ops</p>
          <h2 className="nmw-code">{mission.trackingCode}</h2>
          <div className="nmw-badges">
            <span className={`nurse-priority ${mission.priority?.toLowerCase()}`}>{mission.priority}</span>
            <span className="nurse-status-chip">{mission.status?.replace(/_/g, ' ')}</span>
            <span className="nmw-stage-pill">{currentStep.shortLabel}</span>
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
        <span><Building2 size={14} /> {mission.destination || 'Hospital TBD'}</span>
      </div>

      <div className="nmw-grid">
        {/* Timeline */}
        <section className="nmw-card nmw-timeline-card nmw-timeline-compact">
          <h3 className="nmw-card-title"><Activity size={16} /> Workflow Timeline</h3>
          <ol className="nmw-timeline">
            {NURSE_TIMELINE_STEPS.map((step, i) => {
              const done = missionClosed || i < timelineIndex
              const active = !missionClosed && i === timelineIndex
              const ts = step.stepIds.map((id) => meta?.timestamps[id]).find(Boolean)
              return (
                <li
                  key={step.id}
                  className={`nmw-timeline-item${done ? ' done' : ''}${active ? ' active' : ''}`}
                >
                  <span className="nmw-timeline-dot">{i + 1}</span>
                  <div>
                    <p className="nmw-timeline-label">{step.label}</p>
                    <p className="nmw-timeline-desc">{step.description}</p>
                    {active && (
                      <p className="nmw-timeline-current">{currentStep.label}</p>
                    )}
                    {ts && (
                      <p className="nmw-timeline-time">{format(new Date(ts), 'h:mm a')}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        {/* Current stage + actions */}
        <section className="nmw-card nmw-stage-card">
          <h3 className="nmw-card-title"><ChevronRight size={16} /> Current Stage</h3>
          <p className="nmw-stage-name">{currentStep.label}</p>
          <p className="nmw-stage-desc">{currentStep.description}</p>

          {!readOnly && !onDuty && currentStepId === 'MISSION_ASSIGNED' && !missionAccepted && (
            <p className="nmw-warn">Clock in to accept and execute workflow actions.</p>
          )}
          {!readOnly && currentStepId === 'MISSION_ASSIGNED' && !missionAccepted && !caseReviewed && (
            <p className="nmw-warn">Review case details before you can accept this mission.</p>
          )}
          {!readOnly && missionAccepted && !onScene && currentStepId === 'MISSION_ASSIGNED' && phaseMessage && (
            <p className="nmw-warn">{phaseMessage}</p>
          )}
          {!readOnly && missionAccepted && onScene && phaseMessage && !canDoHandover(mission.status) && (
            <p className="nmw-warn">{phaseMessage}</p>
          )}
          {!readOnly && canDoHandover(mission.status) && !handoverComplete && (
            <p className="nmw-warn">
              Hospital handover is required in this workspace before you can mark the case complete.
            </p>
          )}

          {!readOnly && (
          <div className="nmw-action-grid">
            {stageActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`nmw-action-btn${action.variant === 'primary' ? ' primary' : ''}`}
                disabled={
                  (action.id === 'accept' && !caseReviewed) ||
                  (action.id === 'begin_care' && !onScene)
                }
                onClick={() => handleTask(action.id)}
              >
                {action.label}
              </button>
            ))}
          </div>
          )}

          {!readOnly && (
          <div className="nmw-quick-tasks">
            <p className="nmw-quick-label">Main activities</p>
            <div className="nmw-task-chips">
              {visibleTaskChips.map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  className={`nmw-task-chip${activeTask === id ? ' active' : ''}`}
                  onClick={() => handleTask(id)}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>
          )}
        </section>

        {/* Task panel */}
        <section className="nmw-card nmw-task-card nmw-span-2">
          <h3 className="nmw-card-title">Task Workspace</h3>

          {readOnly && (
            <div className="nmw-task-placeholder">
              <p>This case is closed. View the read-only summary here or in Case History.</p>
            </div>
          )}

          {!readOnly && !activeTask && (
            <div className="nmw-task-placeholder">
              <p>Select an activity from the current stage or use the quick task chips above.</p>
              <p className="text-sm text-zinc-500 mt-2">
                Your workflow: Accept → Patient care → Treatment & monitoring → Handover → Close. Transport is handled by the driver.
              </p>
            </div>
          )}

          {!readOnly && activeTask === 'assessment' && (
            <TaskShell title="Patient Assessment" subtitle="Chief complaint, symptoms, injuries" saving={saving} onSubmit={submitAssessment} submitLabel="Save Assessment">
              <AssessmentTaskFields form={assessmentForm} setForm={setAssessmentForm} />
            </TaskShell>
          )}

          {!readOnly && activeTask === 'vitals' && (
            <TaskShell title="Vital Signs" subtitle="BP, pulse, temperature, SpO₂, respiratory rate" saving={saving} onSubmit={submitVitals} submitLabel="Save Vital Signs">
              <VitalsTaskFields form={vitalsForm} setForm={setVitalsForm} />
            </TaskShell>
          )}

          {!readOnly && activeTask === 'notes' && (
            <TaskShell title="Medical Notes" subtitle="Observations, condition, progress" saving={saving} onSubmit={submitNotes} submitLabel="Save Medical Notes">
              <NotesTaskFields form={notesForm} setForm={setNotesForm} />
            </TaskShell>
          )}

          {!readOnly && activeTask === 'treatment' && (
            <TaskShell title="Treatment Record" subtitle="Interventions performed" saving={saving} onSubmit={submitTreatment} submitLabel="Save Treatment">
              <TreatmentTaskFields form={treatmentForm} setForm={setTreatmentForm} />
            </TaskShell>
          )}

          {!readOnly && activeTask === 'monitoring' && (
            <TaskShell title="Patient Monitoring" subtitle="Update vitals and condition during transport" saving={saving} onSubmit={submitMonitoring} submitLabel="Save Monitoring Update">
              <MonitoringTaskFields form={monitoringForm} setForm={setMonitoringForm} />
            </TaskShell>
          )}

          {!readOnly && activeTask === 'handover' && (
            <TaskShell title="Hospital Handover" subtitle="Transfer to receiving facility" saving={saving} onSubmit={submitHandover} submitLabel="Complete Handover">
              <HandoverTaskFields form={handoverForm} setForm={setHandoverForm} nurseName={fullName} />
            </TaskShell>
          )}

          {!readOnly && activeTask === 'documentation' && (
            <div className="nmw-doc-panel">
              <h4>Clinical Documentation Summary</h4>
              <div className="nmw-doc-grid">
                <DocStat label="Assessments" count={docSummary.assessments} />
                <DocStat label="Vital Signs" count={docSummary.vitals} />
                <DocStat label="Medical Notes" count={docSummary.notes} />
                <DocStat label="Treatments" count={docSummary.treatments} />
                <DocStat label="Monitoring" count={docSummary.monitoring} />
                <DocStat label="Handovers" count={docSummary.handovers} />
              </div>
              {recordsLoading ? (
                <Loader2 className="animate-spin mx-auto mt-4" size={24} />
              ) : caseRecords.length === 0 ? (
                <p className="nurse-empty-inline mt-4">No records yet for this case.</p>
              ) : (
                <ul className="nmw-doc-list">
                  {caseRecords.slice(0, 8).map((r) => (
                    <li key={r.id}>
                      <span>{format(new Date(r.createdAt), 'h:mm a')}</span>
                      <span>
                        {isAssessmentRecord(r)
                          ? `Assessment: ${parseClinicalRecord(r.clinicalNotes)?.chiefComplaint || '—'}`
                          : r.treatmentGiven
                            ? `Treatment: ${r.treatmentGiven}`
                            : r.bloodPressure
                              ? `Vitals: BP ${r.bloodPressure}`
                              : 'Clinical note'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {!handoverComplete && (
                <p className="nmw-warn mt-4">
                  Fill out and save the handover form (Handover activity above) before completing this case.
                </p>
              )}
              <button
                type="button"
                className="nurse-btn primary w-full mt-4"
                disabled={!handoverComplete}
                onClick={closeMission}
              >
                Mark Mission Complete & Close
              </button>
            </div>
          )}
        </section>

        {/* Activity log */}
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
      </div>

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
            disabled={Boolean(stickyPrimaryDisabled)}
            onClick={() => handleTask(stickyPrimary.id)}
          >
            {stickyPrimary.label}
          </button>
        </div>
      )}
    </div>
  )
}

function DocStat({ label, count }: { label: string; count: number }) {
  return (
    <div className="nmw-doc-stat">
      <span className="nmw-doc-count">{count}</span>
      <span className="nmw-doc-label">{label}</span>
    </div>
  )
}
