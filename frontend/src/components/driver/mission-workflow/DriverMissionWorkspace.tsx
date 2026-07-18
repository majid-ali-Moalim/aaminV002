'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  Building2,
  ChevronRight,
  FileText,
  History,
  Loader2,
  MapPin,
  Navigation2,
  RefreshCw,
  Siren,
  Truck,
  User,
  CheckCircle2,
} from 'lucide-react'
import MissionHorizontalTimeline from '@/components/mission-workflow/MissionHorizontalTimeline'
import { driverMissionsApi } from '@/lib/driverApi'
import { useDriverStore, type DriverMission } from '@/lib/stores/driverStore'
import { useDriverSocket } from '@/lib/useDriverSocket'
import { MissionStatusBadge, PriorityBadge } from '@/components/driver/DriverUI'
import DriverMissionDetailModal from '@/components/driver/DriverMissionDetailModal'
import {
  DRIVER_TIMELINE_STEPS,
  getDriverTimelineIndex,
  getStepTimestamp,
  getWorkflowMeta,
  MISSION_EXECUTION_STEPS,
  markDriverMilestoneComplete,
  patchWorkflowMeta,
  setStoredPhase,
  stampWorkflowStage,
  type WorkflowStepId,
} from '@/lib/driver/missionWorkflow'
import { useDriverWorkflowState } from '@/lib/driver/useDriverWorkflowState'
import { DispatcherContactActions } from '@/components/shared/DispatcherContactActions'
import { formatSomaliaPhoneDisplay, resolvePatientPhone } from '@/lib/phoneContact'
import MissionWorkflowButtons from '@/components/mission-workflow/MissionWorkflowButtons'
import {
  getDriverWorkflowButtons,
  type DriverWorkflowButtonId,
} from '@/lib/mission/driverWorkflowButtons'
import { hasMedicalNotesSaved } from '@/lib/mission/workflowMilestones'

const CLOSED = ['COMPLETED', 'CANCELLED']

type Props = {
  selectedCaseId?: string | null
}

function DriverMissionWorkspaceInner({ selectedCaseId }: Props) {
  const { activeMission, setActiveMission, profile } = useDriverStore()
  const { emitMissionStatus } = useDriverSocket()
  const [missionId, setMissionId] = useState<string | null>(selectedCaseId || null)
  const [assignedList, setAssignedList] = useState<DriverMission[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportDraft, setReportDraft] = useState({ fuel: '', mileage: '', notes: '' })
  const [savingReport, setSavingReport] = useState(false)
  const [fetchedCase, setFetchedCase] = useState<DriverMission | null>(null)

  useEffect(() => {
    if (selectedCaseId) setMissionId(selectedCaseId)
  }, [selectedCaseId])

  const load = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true)
      const [active, assignedRes] = await Promise.all([
        driverMissionsApi.getActive().catch(() => null),
        driverMissionsApi.getHistory(1, 20, 'ASSIGNED').catch(() => ({ missions: [] })),
      ])
      setActiveMission(active)
      setAssignedList((assignedRes.missions || []).filter((m: DriverMission) => m.status === 'ASSIGNED'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [setActiveMission])

  useEffect(() => {
    load(true)
    const interval = setInterval(() => load(false), 20000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    if (!selectedCaseId) {
      setFetchedCase(null)
      return
    }
    driverMissionsApi
      .getById(selectedCaseId)
      .then((m) => setFetchedCase(m))
      .catch(() => setFetchedCase(null))
  }, [selectedCaseId])

  const allCases = useMemo(() => {
    const map = new Map<string, DriverMission>()
    if (activeMission) map.set(activeMission.id, activeMission)
    assignedList.forEach((m) => map.set(m.id, m))
    if (fetchedCase) map.set(fetchedCase.id, fetchedCase)
    return Array.from(map.values())
  }, [activeMission, assignedList, fetchedCase])

  const assignedPending = useMemo(
    () => allCases.filter((c) => c.status === 'ASSIGNED'),
    [allCases],
  )

  const activeCases = useMemo(
    () => allCases.filter((c) => !CLOSED.includes(c.status)),
    [allCases],
  )

  const mission = useMemo(() => {
    if (missionId) return allCases.find((c) => c.id === missionId) || activeMission
    return activeMission || activeCases[0] || null
  }, [missionId, allCases, activeMission, activeCases])

  useEffect(() => {
    if (mission && !missionId) setMissionId(mission.id)
  }, [mission, missionId])

  const { currentStepId, meta, syncWorkflow } = useDriverWorkflowState(mission)
  const currentStep = MISSION_EXECUTION_STEPS.find((s) => s.id === currentStepId) ?? MISSION_EXECUTION_STEPS[0]
  const missionClosed = currentStepId === 'MISSION_COMPLETED' || (mission ? CLOSED.includes(mission.status) : false)
  const readOnly = missionClosed
  const runReportSubmitted = Boolean(meta.runReportSubmitted)
  const timelineIndex = getDriverTimelineIndex(currentStepId)
  const progressPct = missionClosed
    ? 100
    : Math.round(((timelineIndex + 1) / DRIVER_TIMELINE_STEPS.length) * 100)

  const careRecords = mission?.patientCareRecords ?? []

  const workflowButtons = useMemo(
    () => getDriverWorkflowButtons(mission, careRecords, readOnly),
    [mission, careRecords, readOnly],
  )

  const stickyPrimary = useMemo(() => {
    return workflowButtons.find((b) => b.state === 'active') ?? null
  }, [workflowButtons])

  const refresh = async () => {
    setRefreshing(true)
    await load(false)
    syncWorkflow()
  }

  const refreshMission = async (id: string) => {
    const updated = await driverMissionsApi.getById(id)
    setActiveMission(updated)
    return updated
  }

  const updateBackend = async (status: string, notes?: string) => {
    if (!mission) return
    await driverMissionsApi.updateStatus(mission.id, status, notes)
    emitMissionStatus(mission.id, status, notes)
    await refreshMission(mission.id)
    syncWorkflow()
  }

  const advanceStep = async (nextStep: WorkflowStepId, backendStatus?: string, note?: string) => {
    if (!mission || readOnly) return
    stampWorkflowStage(mission.id, nextStep, null)
    setStoredPhase(mission.id, nextStep)
    if (backendStatus) await updateBackend(backendStatus, note)
    syncWorkflow()
    toast.success(`Stage: ${MISSION_EXECUTION_STEPS.find((s) => s.id === nextStep)?.label}`)
  }

  const openCase = (id: string) => {
    setMissionId(id)
    setDetailId(id)
  }

  const handleWorkflowButton = async (buttonId: DriverWorkflowButtonId) => {
    if (!mission || readOnly) return
    const wasComplete = Boolean(getWorkflowMeta(mission.id).completedMilestones?.[buttonId])

    switch (buttonId) {
      case 'start_case':
        markDriverMilestoneComplete(mission.id, 'start_case')
        patchWorkflowMeta(mission.id, { enRouteStartedAt: new Date().toISOString() })
        stampWorkflowStage(mission.id, 'EN_ROUTE_SCENE', null)
        setStoredPhase(mission.id, 'EN_ROUTE_SCENE')
        if (mission.status === 'ASSIGNED') {
          await updateBackend('DISPATCHED', 'Driver started case — en route to patient')
        }
        syncWorkflow()
        toast.success('Case started')
        break
      case 'going_to_patient':
        markDriverMilestoneComplete(mission.id, 'going_to_patient')
        logDriverNote(mission.id, 'Driver en route to patient')
        syncWorkflow()
        toast.success('Going to patient')
        break
      case 'arrived_at_patient':
        markDriverMilestoneComplete(mission.id, 'arrived_at_patient')
        await advanceStep('ARRIVED_SCENE', 'ARRIVED_SCENE', 'Driver arrived at patient')
        break
      case 'going_to_hospital': {
        if (!hasMedicalNotesSaved(careRecords, mission.id)) {
          toast.error('Waiting for nurse to save medical notes before transport.')
          return
        }
        markDriverMilestoneComplete(mission.id, 'going_to_hospital')
        await advanceStep('EN_ROUTE_HOSPITAL', 'TRANSPORTING', 'Transport to hospital started')
        break
      }
      case 'arrived_at_hospital':
        markDriverMilestoneComplete(mission.id, 'arrived_at_hospital')
        await advanceStep('ARRIVED_HOSPITAL', 'ARRIVED_HOSPITAL', 'Driver arrived at hospital')
        break
      default:
        break
    }

    if (wasComplete) {
      toast.success('Step updated')
    }
  }

  const openRunReport = () => {
    setReportDraft({
      fuel: meta.fuel || '',
      mileage: meta.mileage || '',
      notes: meta.notes?.ARRIVED_HOSPITAL || '',
    })
    setReportOpen(true)
  }

  const handleAction = async (actionId: string) => {
    if (!mission || readOnly) return
    if (actionId === 'view_details') {
      setDetailId(mission.id)
    } else if (actionId === 'submit_report') {
      openRunReport()
    }
  }

  function logDriverNote(missionId: string, text: string) {
    const meta = getWorkflowMeta(missionId)
    patchWorkflowMeta(missionId, {
      notes: { ...meta.notes, EN_ROUTE_SCENE: text },
    })
  }

  const submitReport = async () => {
    if (!mission || savingReport) return
    setSavingReport(true)
    try {
      const fuel = reportDraft.fuel || meta.fuel || ''
      const mileage = reportDraft.mileage || meta.mileage || ''
      const notes = reportDraft.notes || meta.notes?.ARRIVED_HOSPITAL || ''
      const reportNote = `[Driver Report] Fuel: ${fuel || '—'} · Mileage: ${mileage || '—'} km${notes ? ` · ${notes}` : ''}`

      patchWorkflowMeta(mission.id, {
        fuel: reportDraft.fuel || meta.fuel,
        mileage: reportDraft.mileage || meta.mileage,
        notes: { ...meta.notes, ARRIVED_HOSPITAL: notes },
        runReportSubmitted: true,
      })

      await driverMissionsApi.updateStatus(mission.id, mission.status, reportNote)

      syncWorkflow()
      setReportOpen(false)
      toast.success(runReportSubmitted ? 'Run report updated' : 'Run report saved')
    } catch {
      toast.error('Could not save report to dispatch')
    } finally {
      setSavingReport(false)
    }
  }

  const activityLog = useMemo(() => {
    if (!mission) return []
    const entries: { time: string; text: string }[] = []
    mission.statusLogs?.forEach((log) => {
      if (log.notes) entries.push({ time: log.createdAt, text: log.notes })
    })
    Object.entries(meta.notes || {}).forEach(([step, note]) => {
      if (note) entries.push({ time: meta.timestamps[step as WorkflowStepId] || '', text: note })
    })
    return entries
      .filter((e) => e.text)
      .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
      .slice(0, 12)
      .map((e) => ({
        time: e.time ? format(new Date(e.time), 'HH:mm') : '—',
        text: e.text,
      }))
  }, [mission, meta])

  if (loading && !mission) {
    return (
      <div className="driver-loading-inline">
        <Loader2 className="animate-spin" size={28} />
        <span>Loading case details…</span>
      </div>
    )
  }

  if (!mission && assignedPending.length > 0) {
    return (
      <div className="dcw-queue">
        <div className="dcw-queue-banner">
          <Siren size={18} />
          <span>{assignedPending.length} new assignment{assignedPending.length > 1 ? 's' : ''} from dispatch</span>
        </div>
        <div className="dcw-queue-list">
          {assignedPending.map((m) => (
            <article key={m.id} className="dcw-queue-card">
              <div className="dcw-queue-top">
                <span className="driver-mlc-code">{m.trackingCode}</span>
                <PriorityBadge priority={m.priority} />
              </div>
              <p className="text-sm text-zinc-400">{m.pickupLocation}</p>
              <div className="dcw-queue-actions">
                <button type="button" className="driver-btn-sm primary" onClick={() => openCase(m.id)}>
                  Open Case Details
                </button>
              </div>
            </article>
          ))}
        </div>
        <DriverMissionDetailModal missionId={detailId} open={Boolean(detailId)} onClose={() => setDetailId(null)} />
      </div>
    )
  }

  if (!mission) {
    return (
      <div className="dcw-empty">
        <div className="dcw-empty-icon"><Truck size={32} /></div>
        <h3>No Active Case</h3>
        <p>When dispatch assigns you a run, your transport workflow will appear here.</p>
        <Link href="/driver" className="driver-btn-sm primary">Back to Dashboard</Link>
        <Link href="/driver/missions/history" className="driver-btn-sm ghost">
          <History size={14} /> Mission History
        </Link>
      </div>
    )
  }

  const nurseName = mission.nurse
    ? `${mission.nurse.firstName || ''} ${mission.nurse.lastName || ''}`.trim()
    : '—'
  const destinationLabel =
    mission.destination || mission.destinationHospital?.name || '—'
  const regionLabel = [mission.region?.name, mission.district?.name].filter(Boolean).join(' · ')
  const patientPhone = resolvePatientPhone(mission)

  return (
    <div className={`dcw-dashboard${readOnly ? ' dcw-readonly' : ''}`}>
      {readOnly && (
        <div className="dcw-readonly-banner">
          Case completed — read-only summary. View all closed cases in{' '}
          <Link href="/driver/missions/history">Mission History</Link>.
        </div>
      )}
      <header className="dcw-hero">
        <div>
          <p className="dcw-kicker">Case Details · Transport Ops</p>
          <h2 className="dcw-code">{mission.trackingCode}</h2>
          <div className="dcw-badges">
            <PriorityBadge priority={mission.priority} />
            <MissionStatusBadge status={mission.status} />
            <span className="dcw-stage-pill">{currentStep.shortLabel}</span>
          </div>
        </div>
        <div className="dcw-hero-right">
          <div className="dcw-progress-ring" style={{ ['--pct' as string]: `${progressPct}%` }}>
            <span>{progressPct}%</span>
          </div>
          <button type="button" className="dcw-refresh" onClick={refresh} aria-label="Refresh">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="dcw-progress-track">
        <div className="dcw-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="dcw-case-strip">
        <span><User size={14} /> {mission.patient?.fullName || mission.callerName || 'Patient'}</span>
        <span><MapPin size={14} /> {mission.pickupLocation || '—'}</span>
        <span><Building2 size={14} /> {destinationLabel}</span>
        <span><User size={14} /> Nurse: {nurseName}</span>
      </div>

      <section className="dcw-card dcw-timeline-card dcw-span-2">
        <h3 className="dcw-card-title"><Navigation2 size={16} /> Mission Progress</h3>
        <MissionHorizontalTimeline
          classPrefix="dcw"
          steps={DRIVER_TIMELINE_STEPS.map((s) => ({
            id: s.id,
            label: s.label,
            shortLabel: s.shortLabel,
            icon:
              s.id === 'START'
                ? Navigation2
                : s.id === 'EN_ROUTE'
                  ? Navigation2
                  : s.id === 'ON_SCENE'
                    ? MapPin
                    : s.id === 'TRANSPORT'
                      ? Truck
                      : Building2,
          }))}
          activeIndex={timelineIndex}
          completed={missionClosed}
          currentStepLabel={currentStep.label}
          getStepTime={(i) => {
            const step = DRIVER_TIMELINE_STEPS[i]
            const ts = step.stepIds
              .map((id) => meta.timestamps[id] || getStepTimestamp(mission, id))
              .find(Boolean)
            return ts || null
          }}
        />
      </section>

      <div className="dcw-grid dcw-grid-stage">
        <section className="dcw-card dcw-stage-card">
          <h3 className="dcw-card-title"><ChevronRight size={16} /> Current Stage</h3>
          <p className="dcw-stage-name">{currentStep.label}</p>
          <p className="dcw-stage-desc">{currentStep.description}</p>

          {!readOnly && currentStepId === 'ARRIVED_HOSPITAL' && (
            <p className="dcw-warn">Your timeline is complete. The nurse will hand over and close the case.</p>
          )}

          {!readOnly && (
            <MissionWorkflowButtons
              buttons={workflowButtons}
              onAction={(id) => handleWorkflowButton(id as DriverWorkflowButtonId)}
              classPrefix="dcw"
              readOnly={readOnly}
            />
          )}

          {!readOnly && runReportSubmitted && currentStepId === 'ARRIVED_HOSPITAL' && (
            <div className="dcw-run-report-summary">
              <p className="dcw-run-report-kicker">Run report complete</p>
              <ul className="dcw-run-report-list">
                <li><span>Fuel</span> {meta.fuel ? `${meta.fuel} L` : '—'}</li>
                <li><span>Mileage</span> {meta.mileage ? `${meta.mileage} km` : '—'}</li>
                {meta.notes?.ARRIVED_HOSPITAL && (
                  <li className="dcw-run-report-notes"><span>Notes</span> {meta.notes.ARRIVED_HOSPITAL}</li>
                )}
              </ul>
              <button type="button" className="driver-btn-sm ghost w-full" onClick={openRunReport}>
                Edit Run Report
              </button>
            </div>
          )}

          {!readOnly && !runReportSubmitted && (
          <div className="dcw-action-grid dcw-action-grid--secondary">
            {currentStep.actions
              .filter((action) => action.id === 'view_details' || action.id === 'submit_report')
              .map((action) => (
              <button
                key={action.id}
                type="button"
                className="dcw-action-btn"
                onClick={() => handleAction(action.id)}
              >
                {action.label}
              </button>
            ))}
          </div>
          )}

          {!readOnly && runReportSubmitted && (
            <button type="button" className="dcw-action-btn w-full mt-3" onClick={() => handleAction('view_details')}>
              View Case Summary
            </button>
          )}
        </section>

        <section className="dcw-card">
          <h3 className="dcw-card-title">Case Details</h3>
          <div className="dcw-info-grid">
            <InfoItem label="Case ID" value={mission.trackingCode} />
            <InfoItem label="Status" value={mission.status?.replace(/_/g, ' ')} />
            <InfoItem label="Priority" value={mission.priority} />
            <InfoItem label="Case type" value={mission.incidentCategory?.name} />
            <InfoItem label="Patient" value={mission.patient?.fullName || mission.callerName} />
            <InfoItem label="Patient phone" value={formatSomaliaPhoneDisplay(patientPhone)} />
            <div className="dcw-info-item dcw-info-item--full">
              <DispatcherContactActions
                dispatcher={mission.dispatcher}
                chatHref="/driver/chat"
                variant="driver"
              />
            </div>
            <InfoItem
              label="Age / Gender"
              value={[mission.patient?.age, mission.patient?.gender].filter(Boolean).join(' · ')}
            />
            <InfoItem label="Pickup" value={mission.pickupLocation} />
            <InfoItem label="Landmark" value={mission.pickupLandmark} />
            <InfoItem label="Region" value={regionLabel} />
            <InfoItem label="Destination" value={destinationLabel} />
            <InfoItem label="Condition" value={mission.patientCondition} />
            <InfoItem label="Ambulance" value={mission.ambulance?.ambulanceNumber || profile?.assignedAmbulance?.ambulanceNumber} />
            <InfoItem label="Nurse" value={nurseName !== '—' ? nurseName : undefined} />
            <InfoItem label="Dispatcher" value={mission.dispatcher?.user?.username} />
            <InfoItem
              label="Assigned"
              value={mission.assignedAt ? format(new Date(mission.assignedAt), 'MMM d, h:mm a') : undefined}
            />
            {mission.completedAt && (
              <InfoItem label="Completed" value={format(new Date(mission.completedAt), 'MMM d, h:mm a')} />
            )}
          </div>
        </section>
      </div>

      <section className="dcw-card">
        <h3 className="dcw-card-title">Activity Log</h3>
        {activityLog.length === 0 ? (
          <p className="dcw-empty-inline">Workflow activity will appear here.</p>
        ) : (
          <ul className="dcw-activity-list">
            {activityLog.map((e, i) => (
              <li key={i}><span>{e.time}</span> {e.text}</li>
            ))}
          </ul>
        )}
      </section>

      {activeCases.length > 1 && (
        <div className="dcw-case-switcher">
          <span className="text-xs text-zinc-500">Switch case:</span>
          {activeCases.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`dcw-case-chip${c.id === mission.id ? ' active' : ''}`}
              onClick={() => setMissionId(c.id)}
            >
              {c.trackingCode}
            </button>
          ))}
        </div>
      )}

      {!readOnly && stickyPrimary && (
        <div className="dcw-sticky-action">
          <button
            type="button"
            className="dcw-sticky-btn secondary"
            onClick={() => handleAction('view_details')}
            aria-label="View case details"
          >
            <FileText size={18} />
          </button>
          <button
            type="button"
            className="dcw-sticky-btn primary"
            onClick={() => handleWorkflowButton(stickyPrimary.id)}
          >
            {stickyPrimary.label}
          </button>
        </div>
      )}

      {reportOpen && !readOnly && (
        <div className="driver-modal-overlay" role="dialog">
          <button type="button" className="driver-modal-backdrop" onClick={() => setReportOpen(false)} aria-label="Close" />
          <div className="driver-modal-panel">
            <div className="driver-modal-header">
              <h2 className="driver-modal-title">{runReportSubmitted ? 'Edit Run Report' : 'Run Report'}</h2>
            </div>
            <div className="driver-modal-body mew-form">
              <input className="mew-input" placeholder="Fuel usage (L)" value={reportDraft.fuel} onChange={(e) => setReportDraft((d) => ({ ...d, fuel: e.target.value }))} />
              <input className="mew-input mt-2" placeholder="Mileage (km)" value={reportDraft.mileage} onChange={(e) => setReportDraft((d) => ({ ...d, mileage: e.target.value }))} />
              <textarea className="mew-textarea mt-2" rows={3} placeholder="Notes" value={reportDraft.notes} onChange={(e) => setReportDraft((d) => ({ ...d, notes: e.target.value }))} />
            </div>
            <div className="driver-modal-footer">
              <button type="button" className="driver-btn-sm ghost flex-1" onClick={() => setReportOpen(false)}>Cancel</button>
              <button type="button" className="driver-btn-sm primary flex-1" onClick={submitReport} disabled={savingReport}>
                {savingReport ? 'Saving…' : runReportSubmitted ? 'Update Report' : 'Save Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      <DriverMissionDetailModal
        missionId={detailId}
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
      />
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="dcw-info-item">
      <span className="dcw-info-label">{label}</span>
      <span className="dcw-info-value">{value || '—'}</span>
    </div>
  )
}

function MissionContent() {
  const searchParams = useSearchParams()
  const caseId = searchParams.get('caseId')
  return <DriverMissionWorkspaceInner selectedCaseId={caseId} />
}

export default function DriverMissionWorkspace() {
  return (
    <Suspense
      fallback={
        <div className="driver-loading-inline">
          <Loader2 className="animate-spin" size={28} />
        </div>
      }
    >
      <MissionContent />
    </Suspense>
  )
}
