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
  Phone,
  RefreshCw,
  Stethoscope,
  Truck,
  User,
} from 'lucide-react'
import { emergencyRequestsService, nursesService } from '@/lib/api'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'
import { useNurseCases } from '@/lib/nurse/useNurseCases'
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel'
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
  getNurseCurrentStep,
  getNurseStepIndex,
  getNurseWorkflowMeta,
  getNextStepId,
  logNurseActivity,
  markStepComplete,
  NURSE_WORKFLOW_STEPS,
  resolveNurseWorkflowStep,
  setStoredNursePhase,
  stampNurseStage,
  type NurseTaskId,
  type NurseWorkflowStepId,
} from '@/lib/nurse/nurseWorkflow'
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
  const [hospitalName, setHospitalName] = useState('')

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

  const currentStepId = resolveNurseWorkflowStep(mission)
  const currentStep = getNurseCurrentStep(mission)
  const stepIndex = getNurseStepIndex(currentStepId)
  const progressPct = Math.round(((stepIndex + 1) / NURSE_WORKFLOW_STEPS.length) * 100)
  const meta = mission ? getNurseWorkflowMeta(mission.id) : null
  const onDuty = shiftStatus === 'ON_DUTY' || shiftStatus === 'TRANSPORTING' || shiftStatus === 'AVAILABLE'

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
    toast.success(`Stage: ${NURSE_WORKFLOW_STEPS.find((s) => s.id === next)?.label}`)
  }

  const acceptMission = (id: string) => {
    if (!onDuty) {
      toast.error('Clock in under Shift & Attendance to accept missions')
      return
    }
    setMissionId(id)
    advanceTo('EN_ROUTE', 'Mission accepted by nurse', id)
  }

  const handleTask = async (taskId: NurseTaskId) => {
    if (!mission) return

    switch (taskId) {
      case 'view_case':
        setActiveTask(null)
        break
      case 'accept':
        acceptMission(mission.id)
        break
      case 'review_emergency':
        setActiveTask(null)
        logNurseActivity(mission.id, 'Emergency information reviewed')
        toast.success('Case information reviewed')
        break
      case 'contact_driver':
        if (mission.driver?.phone) window.location.href = `tel:${mission.driver.phone}`
        else toast('Open Communication Center to message driver', { icon: '📞' })
        break
      case 'contact_dispatcher':
        toast.success('Connecting to dispatch channel…')
        break
      case 'begin_care':
        advanceTo('PATIENT_ASSESSMENT', 'Patient care started at scene')
        setActiveTask('assessment')
        break
      case 'assessment':
        setActiveTask('assessment')
        break
      case 'vitals':
        setActiveTask('vitals')
        break
      case 'notes':
        setActiveTask('notes')
        break
      case 'treatment':
        setActiveTask('treatment')
        break
      case 'monitoring':
        setActiveTask('monitoring')
        break
      case 'coordinate_hospital': {
        const hospital = hospitalName || prompt('Destination hospital name:')
        if (!hospital) return
        setHospitalName(hospital)
        try {
          await emergencyRequestsService.update(mission.id, { destination: hospital })
          logNurseActivity(mission.id, `Hospital coordinated: ${hospital}`)
          toast.success('Hospital destination updated')
          refresh()
        } catch {
          toast.error('Could not update hospital destination')
        }
        break
      }
      case 'handover':
        setActiveTask('handover')
        break
      case 'documentation':
        setActiveTask('documentation')
        break
      case 'close_mission':
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

  const saveRecord = async (payload: Record<string, unknown>, stepId?: NurseWorkflowStepId) => {
    if (!nurseId || !mission) return
    setSaving(true)
    try {
      await nursesService.createPatientCareRecord({
        emergencyRequestId: mission.id,
        nurseId,
        patientId: mission.patientId || mission.patient?.id,
        ...payload,
      })
      if (stepId) {
        markStepComplete(mission.id, stepId)
        logNurseActivity(mission.id, `${NURSE_WORKFLOW_STEPS.find((s) => s.id === stepId)?.label} saved`)
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
    await saveRecord({ clinicalNotes: encodeAssessment(assessmentForm) }, 'PATIENT_ASSESSMENT')
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
    await saveRecord({ clinicalNotes: text }, 'MEDICAL_NOTES')
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
    await saveRecord({ clinicalNotes: encodeHandover(handoverForm) }, 'HOSPITAL_HANDOVER')
    advanceTo('COMPLETE_DOCUMENTATION')
    setActiveTask('documentation')
  }

  const markReadyTransport = async () => {
    if (!mission) return
    try {
      await emergencyRequestsService.updateStatus(mission.id, 'TRANSPORTING')
      advanceTo('PATIENT_MONITORING', 'Patient ready for transport')
      logNurseActivity(mission.id, 'Transport phase started')
      refresh()
    } catch {
      toast.error('Could not update transport status')
    }
  }

  const closeMission = async () => {
    if (!mission) return
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
                <button type="button" className="nurse-btn ghost" onClick={() => setMissionId(m.id)}>
                  View Details
                </button>
                <button
                  type="button"
                  className="nurse-btn primary"
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
        <Link href="/nurse/patient-care?tab=assigned" className="nurse-btn primary">View Assigned Missions</Link>
        <Link href="/nurse/shifts" className="nurse-btn ghost">Shift & Attendance</Link>
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
    <div className="nmw-dashboard">
      {/* Hero */}
      <header className="nmw-hero">
        <div>
          <p className="nmw-kicker">Mission Workspace · Live Clinical Ops</p>
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
        <section className="nmw-card nmw-timeline-card">
          <h3 className="nmw-card-title"><Activity size={16} /> Workflow Timeline</h3>
          <ol className="nmw-timeline">
            {NURSE_WORKFLOW_STEPS.map((step, i) => {
              const done = i < stepIndex || currentStepId === 'MISSION_CLOSED'
              const active = step.id === currentStepId
              const ts = meta?.timestamps[step.id]
              return (
                <li
                  key={step.id}
                  className={`nmw-timeline-item${done ? ' done' : ''}${active ? ' active' : ''}`}
                >
                  <span className="nmw-timeline-dot">{i + 1}</span>
                  <div>
                    <p className="nmw-timeline-label">{step.label}</p>
                    <p className="nmw-timeline-desc">{step.description}</p>
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

          {!onDuty && currentStepId === 'MISSION_ASSIGNED' && (
            <p className="nmw-warn">Clock in to accept and execute workflow actions.</p>
          )}

          <div className="nmw-action-grid">
            {currentStep.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`nmw-action-btn${action.variant === 'primary' ? ' primary' : ''}`}
                onClick={() => handleTask(action.id)}
              >
                {action.label}
              </button>
            ))}
            {['TREATMENT', 'PATIENT_ASSESSMENT', 'MEDICAL_NOTES'].includes(currentStepId) && (
              <button type="button" className="nmw-action-btn primary" onClick={markReadyTransport}>
                Mark Ready For Transport
              </button>
            )}
          </div>

          <div className="nmw-quick-tasks">
            <p className="nmw-quick-label">Main activities</p>
            <div className="nmw-task-chips">
              {(
                [
                  ['assessment', 'Assessment', Stethoscope],
                  ['vitals', 'Vital Signs', Activity],
                  ['notes', 'Medical Notes', ClipboardList],
                  ['treatment', 'Treatment', HeartPulse],
                  ['monitoring', 'Monitoring', Activity],
                  ['handover', 'Handover', Building2],
                  ['documentation', 'Documentation', ClipboardList],
                ] as const
              ).map(([id, label, Icon]) => (
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

          <PickupGpsPanel request={mission} tone="dark" title="Scene GPS" />

          {mission.driver?.phone && (
            <div className="nmw-comms">
              <a href={`tel:${mission.driver.phone}`} className="nurse-btn ghost">
                <Phone size={14} /> Call Driver
              </a>
            </div>
          )}
        </section>

        {/* Task panel */}
        <section className="nmw-card nmw-task-card nmw-span-2">
          <h3 className="nmw-card-title">Task Workspace</h3>

          {!activeTask && (
            <div className="nmw-task-placeholder">
              <p>Select an activity from the current stage or use the quick task chips above.</p>
              <p className="text-sm text-zinc-500 mt-2">
                Driver + Nurse flow: Driver arrives → Nurse assesses → Vitals → Notes → Treatment → Transport → Handover → Closed
              </p>
            </div>
          )}

          {activeTask === 'assessment' && (
            <TaskShell title="Patient Assessment" subtitle="Chief complaint, symptoms, injuries" saving={saving} onSubmit={submitAssessment} submitLabel="Save Assessment">
              <AssessmentTaskFields form={assessmentForm} setForm={setAssessmentForm} />
            </TaskShell>
          )}

          {activeTask === 'vitals' && (
            <TaskShell title="Vital Signs" subtitle="BP, pulse, temperature, SpO₂, respiratory rate" saving={saving} onSubmit={submitVitals} submitLabel="Save Vital Signs">
              <VitalsTaskFields form={vitalsForm} setForm={setVitalsForm} />
            </TaskShell>
          )}

          {activeTask === 'notes' && (
            <TaskShell title="Medical Notes" subtitle="Observations, condition, progress" saving={saving} onSubmit={submitNotes} submitLabel="Save Medical Notes">
              <NotesTaskFields form={notesForm} setForm={setNotesForm} />
            </TaskShell>
          )}

          {activeTask === 'treatment' && (
            <TaskShell title="Treatment Record" subtitle="Interventions performed" saving={saving} onSubmit={submitTreatment} submitLabel="Save Treatment">
              <TreatmentTaskFields form={treatmentForm} setForm={setTreatmentForm} />
            </TaskShell>
          )}

          {activeTask === 'monitoring' && (
            <TaskShell title="Patient Monitoring" subtitle="Update vitals and condition during transport" saving={saving} onSubmit={submitMonitoring} submitLabel="Save Monitoring Update">
              <MonitoringTaskFields form={monitoringForm} setForm={setMonitoringForm} />
            </TaskShell>
          )}

          {activeTask === 'handover' && (
            <TaskShell title="Hospital Handover" subtitle="Transfer to receiving facility" saving={saving} onSubmit={submitHandover} submitLabel="Complete Handover">
              <HandoverTaskFields form={handoverForm} setForm={setHandoverForm} nurseName={fullName} />
            </TaskShell>
          )}

          {activeTask === 'documentation' && (
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
              <button type="button" className="nurse-btn primary w-full mt-4" onClick={closeMission}>
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
