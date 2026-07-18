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
import { emergencyRequestsService, nursesService } from '@/lib/api'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'
import { useNurseCases } from '@/lib/nurse/useNurseCases'
import {
  encodeAssessment,
  encodeHandover,
  isHandoverRecord,
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
  type NurseTaskId,
  type NurseWorkflowStepId,
} from '@/lib/nurse/nurseWorkflow'
import { useNurseWorkflowState } from '@/lib/nurse/useNurseWorkflowState'
import MissionHorizontalTimeline from '@/components/mission-workflow/MissionHorizontalTimeline'
import {
  HandoverTaskFields,
  MedicalNotesCombinedFields,
  TaskShell,
  type HandoverFormState,
  type MedicalNotesFormState,
} from './NurseWorkflowTasks'
import { FieldCaseDetailModal } from '@/components/shared/FieldCaseDetailModal'
import { DispatcherContactActions } from '@/components/shared/DispatcherContactActions'
import { formatSomaliaPhoneDisplay, resolvePatientPhone } from '@/lib/phoneContact'

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
    treatmentType: TREATMENT_TYPES[0],
    medication: '',
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
    if (currentStepId === 'MISSION_ASSIGNED') {
      return [
        {
          id: 'begin_care' as NurseTaskId,
          label: onScene ? 'Start Patient Care' : 'Waiting for crew on scene',
          variant: 'primary' as const,
        },
        { id: 'view_case' as NurseTaskId, label: 'Review Case Details', variant: 'secondary' as const },
      ]
    }
    return currentStep.actions.filter((a) => a.id !== 'accept')
  }, [currentStepId, currentStep.actions, onScene])

  const stickyPrimary = useMemo(() => {
    return stageActions.find((a) => a.variant === 'primary') ?? stageActions[0] ?? null
  }, [stageActions])

  const stickyPrimaryDisabled = stickyPrimary && stickyPrimary.id === 'begin_care' && !onScene

  const visibleTaskChips = useMemo((): [NurseTaskId, string, typeof ClipboardList][] => {
    if (!mission) return []
    const status = mission.status
    const chips: [NurseTaskId, string, typeof ClipboardList][] = []
    if (canDoPatientCareTasks(status) || canDoTreatmentMonitoring(status)) {
      chips.push(['medical_notes', 'Medical Notes', ClipboardList])
    }
    if (canDoHandover(status)) {
      chips.push(['handover', 'Handover', Building2])
    }
    return chips
  }, [mission])

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
    markNurseCaseReviewed(id)
    syncWorkflow()
  }

  const handleTask = async (taskId: NurseTaskId) => {
    if (!mission || readOnly) return

    switch (taskId) {
      case 'view_case':
        openCaseDetails(mission.id)
        syncWorkflow()
        setActiveTask(null)
        logNurseActivity(mission.id, 'Case details opened')
        break
      case 'review_emergency':
        openCaseDetails(mission.id)
        syncWorkflow()
        setActiveTask(null)
        logNurseActivity(mission.id, 'Case details opened')
        break
      case 'begin_care':
        if (!guardTask('begin_care')) return
        advanceTo('PATIENT_ASSESSMENT', 'Patient care started')
        setActiveTask('medical_notes')
        break
      case 'medical_notes':
        if (!guardTask('medical_notes')) return
        setActiveTask('medical_notes')
        break
      case 'handover':
        if (!guardTask('handover')) return
        setActiveTask('handover')
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
        PATIENT_ASSESSMENT: 'medical_notes',
        VITAL_SIGNS: 'medical_notes',
        MEDICAL_NOTES: 'medical_notes',
        TREATMENT: 'medical_notes',
        HOSPITAL_HANDOVER: 'handover',
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

  const submitMedicalNotes = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!medicalNotesForm.chiefComplaint.trim()) {
      toast.error('Chief complaint is required')
      return
    }
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

    await saveRecord(
      {
        clinicalNotes: noteSections.join('\n\n'),
        bloodPressure: medicalNotesForm.bloodPressure || undefined,
        heartRate: medicalNotesForm.heartRate || undefined,
        temperature: medicalNotesForm.temperature || undefined,
        oxygenSaturation: medicalNotesForm.oxygenSaturation || undefined,
        respiratoryRate: medicalNotesForm.respiratoryRate || undefined,
        treatmentGiven: medicalNotesForm.treatmentType || undefined,
        medications: medicalNotesForm.medication || undefined,
      },
      'PATIENT_ASSESSMENT',
      'Medical notes saved',
    )
    advanceTo('MEDICAL_NOTES')
    setActiveTask(null)
  }

  const submitHandover = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!handoverForm.signature.trim()) {
      toast.error('Signature is required')
      return
    }
    await saveRecord({ clinicalNotes: encodeHandover(handoverForm) }, 'HOSPITAL_HANDOVER', 'Hospital handover completed')
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
          <span>{assignedPending.length} new mission{assignedPending.length > 1 ? 's' : ''} from dispatch</span>
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
                  Case Details
                </button>
                <button type="button" className="nurse-btn primary" onClick={() => openCase(m.id)}>
                  Open Mission
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
        <h3>No Active Mission</h3>
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
          <p className="nmw-kicker">Case Details · Live Clinical Ops</p>
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
        <span><Building2 size={14} /> {destinationLabel}</span>
      </div>

      <section className="nmw-card nmw-timeline-card nmw-span-2">
        <h3 className="nmw-card-title"><Activity size={16} /> Mission Progress</h3>
        <MissionHorizontalTimeline
          classPrefix="nmw"
          steps={NURSE_TIMELINE_STEPS.map((s) => ({
            id: s.id,
            label: s.label,
            shortLabel: s.shortLabel,
            icon:
              s.id === 'PATIENT_CARE'
                ? Stethoscope
                : s.id === 'TREATMENT'
                  ? HeartPulse
                  : s.id === 'HANDOVER'
                    ? Building2
                    : CheckCircle2,
          }))}
          activeIndex={timelineIndex}
          completed={missionClosed}
          currentStepLabel={currentStep.label}
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
          <p className="nmw-stage-name">{currentStep.label}</p>
          <p className="nmw-stage-desc">{currentStep.description}</p>

          {!readOnly && !onDuty && (
            <p className="nmw-warn">Clock in to execute clinical workflow actions.</p>
          )}
          {!readOnly && !onScene && currentStepId === 'MISSION_ASSIGNED' && phaseMessage && (
            <p className="nmw-warn">{phaseMessage}</p>
          )}
          {!readOnly && onScene && phaseMessage && !canDoHandover(mission.status) && (
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
                disabled={action.id === 'begin_care' && !onScene}
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

          {!readOnly && activeTask === 'medical_notes' && (
            <TaskShell
              title="Medical Notes"
              subtitle="Assessment, vitals, observations, and treatment in one record"
              saving={saving}
              onSubmit={submitMedicalNotes}
              submitLabel="Save Medical Notes"
            >
              <MedicalNotesCombinedFields form={medicalNotesForm} setForm={setMedicalNotesForm} />
            </TaskShell>
          )}

          {!readOnly && activeTask === 'handover' && (
            <>
              <TaskShell
                title="Hospital Handover"
                subtitle="Complete transfer details for receiving staff"
                saving={saving}
                onSubmit={submitHandover}
                submitLabel="Save Handover"
              >
                <HandoverTaskFields form={handoverForm} setForm={setHandoverForm} nurseName={fullName} />
              </TaskShell>
              {handoverComplete && canCloseMission(mission.status) && (
                <button type="button" className="nurse-btn primary w-full mt-4" onClick={closeMission}>
                  Mark Mission Complete & Close
                </button>
              )}
            </>
          )}
        </section>

        <section className="nmw-card">
          <h3 className="nmw-card-title">Case Details</h3>
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
              chatHref="/nurse/chat"
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
            disabled={Boolean(stickyPrimaryDisabled)}
            onClick={() => handleTask(stickyPrimary.id)}
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
