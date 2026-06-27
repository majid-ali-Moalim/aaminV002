'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  Activity,
  Building2,
  ChevronRight,
  Clock,
  FileText,
  History,
  Loader2,
  MapPin,
  RefreshCw,
  Siren,
  Truck,
  User,
} from 'lucide-react'
import { driverMissionsApi } from '@/lib/driverApi'
import { useDriverStore, type DriverMission } from '@/lib/stores/driverStore'
import { useDriverSocket } from '@/lib/useDriverSocket'
import { useElapsedTimer } from '@/lib/useElapsedTimer'
import { MissionStatusBadge, PriorityBadge } from '@/components/driver/DriverUI'
import DriverMissionDetailModal from '@/components/driver/DriverMissionDetailModal'
import {
  DRIVER_TIMELINE_STEPS,
  getDriverTimelineIndex,
  getStepTimestamp,
  getWorkflowMeta,
  markCaseReviewed,
  MISSION_EXECUTION_STEPS,
  patchWorkflowMeta,
  setStoredPhase,
  stampWorkflowStage,
  type WorkflowActionId,
  type WorkflowStepId,
} from '@/lib/driver/missionWorkflow'
import { useDriverWorkflowState } from '@/lib/driver/useDriverWorkflowState'

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
  const caseReviewed = Boolean(meta.reviewedAt)
  const enRouteStartedAt =
    meta.enRouteStartedAt || meta.timestamps.EN_ROUTE_SCENE || null
  const enRouteElapsed = useElapsedTimer(
    currentStepId === 'EN_ROUTE_SCENE' ? enRouteStartedAt : null,
  )
  const timelineIndex = getDriverTimelineIndex(currentStepId)
  const progressPct = missionClosed
    ? 100
    : Math.round(((timelineIndex + 1) / DRIVER_TIMELINE_STEPS.length) * 100)
  const onDuty = profile?.shiftStatus === 'ON_DUTY'

  const stickyPrimary = useMemo(() => {
    const actions = currentStep.actions.filter((a) => a.id !== 'submit_report')
    return actions.find((a) => a.variant === 'primary') ?? actions[0] ?? null
  }, [currentStep.actions])

  const stickyPrimaryDisabled =
    stickyPrimary &&
    ((stickyPrimary.id === 'accept' && !caseReviewed) ||
      (!onDuty &&
        ['accept', 'mark_arrival', 'start_transport', 'mark_hospital_arrival', 'start_navigation'].includes(
          stickyPrimary.id,
        )))

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
    if (!onDuty) {
      toast.error('Clock in under Shift & Attendance to update mission status')
      return
    }
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

  const reviewCase = (id: string) => {
    markCaseReviewed(id)
    setDetailId(id)
    syncWorkflow()
    toast.success('Case reviewed — you may now accept the assignment')
  }

  const acceptAssignment = async (id: string) => {
    if (!onDuty) {
      toast.error('Clock in under Shift & Attendance to accept assignments')
      return
    }
    const reviewed = getWorkflowMeta(id).reviewedAt
    if (!reviewed) {
      toast.error('Review case details before accepting')
      return
    }
    try {
      setMissionId(id)
      stampWorkflowStage(id, 'ACCEPTED', null)
      setStoredPhase(id, 'ACCEPTED')
      await driverMissionsApi.updateStatus(id, 'DISPATCHED', 'Driver accepted assignment')
      emitMissionStatus(id, 'DISPATCHED', 'Driver accepted assignment')
      setAssignedList((prev) => prev.filter((m) => m.id !== id))
      await refreshMission(id)
      syncWorkflow()
      toast.success('Assignment accepted')
      refresh()
    } catch {
      toast.error('Could not accept assignment')
    }
  }

  const rejectAssignment = async (id: string) => {
    const reason = window.prompt('Reason for rejecting this assignment (optional):') ?? ''
    if (reason === null) return
    try {
      await driverMissionsApi.reject(id, reason.trim() || undefined)
      setAssignedList((prev) => prev.filter((m) => m.id !== id))
      if (mission?.id === id) setMissionId(null)
      toast.success('Assignment rejected — dispatch has been notified')
      refresh()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not reject assignment')
    }
  }

  const handleAction = async (actionId: WorkflowActionId) => {
    if (!mission || readOnly) return

    switch (actionId) {
      case 'accept':
        if (!caseReviewed) {
          toast.error('Review case details before accepting')
          return
        }
        acceptAssignment(mission.id)
        break
      case 'view_details':
        if (currentStepId === 'ASSIGNED' && !caseReviewed) {
          reviewCase(mission.id)
        } else {
          setDetailId(mission.id)
        }
        break
      case 'start_navigation':
        patchWorkflowMeta(mission.id, {
          enRouteStartedAt: new Date().toISOString(),
        })
        await advanceStep('EN_ROUTE_SCENE', undefined, 'Driver en route to scene')
        syncWorkflow()
        break
      case 'update_eta': {
        const eta = prompt('Estimated arrival (minutes):')
        if (eta) {
          patchWorkflowMeta(mission.id, { eta })
          syncWorkflow()
          toast.success('ETA updated')
        }
        break
      }
      case 'request_backup':
        toast.success('Backup request sent to dispatch')
        break
      case 'report_delay':
        toast('Delay reported to dispatch', { icon: '⚠️' })
        break
      case 'mark_arrival':
        await advanceStep('ARRIVED_SCENE', 'ARRIVED_SCENE', 'Driver arrived at scene')
        break
      case 'start_transport':
        await advanceStep('EN_ROUTE_HOSPITAL', 'TRANSPORTING', 'Transport to hospital started')
        break
      case 'mark_hospital_arrival':
        await advanceStep('ARRIVED_HOSPITAL', 'ARRIVED_HOSPITAL', 'Arrived at hospital')
        break
      case 'submit_report':
        setReportOpen(true)
        break
      default:
        break
    }
  }

  const submitReport = async () => {
    if (!mission) return
    patchWorkflowMeta(mission.id, {
      fuel: reportDraft.fuel || meta.fuel,
      mileage: reportDraft.mileage || meta.mileage,
      notes: { ...meta.notes, ARRIVED_HOSPITAL: reportDraft.notes || meta.notes?.ARRIVED_HOSPITAL },
    })
    syncWorkflow()
    setReportOpen(false)
    toast.success('Run report saved')
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
        <span>Loading case workspace…</span>
      </div>
    )
  }

  if (!mission && assignedPending.length > 0) {
    return (
      <div className="dcw-queue">
        <div className="dcw-queue-banner">
          <Siren size={18} />
          <span>{assignedPending.length} assignment{assignedPending.length > 1 ? 's' : ''} awaiting acceptance</span>
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
                <button type="button" className="driver-btn-sm ghost" onClick={() => reviewCase(m.id)}>
                  Review Case
                </button>
                <button
                  type="button"
                  className="driver-btn-sm primary"
                  disabled={!getWorkflowMeta(m.id).reviewedAt}
                  onClick={() => acceptAssignment(m.id)}
                >
                  Accept Assignment
                </button>
                <button
                  type="button"
                  className="driver-btn-sm ghost text-red-500 border-red-200"
                  onClick={() => rejectAssignment(m.id)}
                >
                  Reject
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
        <Link href="/driver/shifts" className="driver-btn-sm primary">Shift & Attendance</Link>
        <Link href="/driver/missions/history" className="driver-btn-sm ghost">
          <History size={14} /> Mission History
        </Link>
      </div>
    )
  }

  const nurseName = mission.nurse
    ? `${mission.nurse.firstName || ''} ${mission.nurse.lastName || ''}`.trim()
    : '—'

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
          <p className="dcw-kicker">Case Workspace · Transport Ops</p>
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
        <span><Building2 size={14} /> {mission.destination || meta.hospital || 'Hospital TBD'}</span>
        <span><User size={14} /> Nurse: {nurseName}</span>
      </div>

      <div className="dcw-grid">
        <section className="dcw-card dcw-timeline-card">
          <h3 className="dcw-card-title"><Activity size={16} /> Workflow Timeline</h3>
          <ol className="dcw-timeline">
            {DRIVER_TIMELINE_STEPS.map((step, i) => {
              const done = missionClosed || i < timelineIndex
              const active = !missionClosed && i === timelineIndex
              const ts = step.stepIds.map((id) => meta.timestamps[id] || getStepTimestamp(mission, id)).find(Boolean)
              return (
                <li key={step.id} className={`dcw-timeline-item${done ? ' done' : ''}${active ? ' active' : ''}`}>
                  <span className="dcw-timeline-dot">{i + 1}</span>
                  <div>
                    <p className="dcw-timeline-label">{step.label}</p>
                    <p className="dcw-timeline-desc">{step.description}</p>
                    {active && <p className="dcw-timeline-current">{currentStep.label}</p>}
                    {ts && <p className="dcw-timeline-time">{format(new Date(ts), 'h:mm a')}</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        <section className="dcw-card dcw-stage-card">
          <h3 className="dcw-card-title"><ChevronRight size={16} /> Current Stage</h3>
          <p className="dcw-stage-name">{currentStep.label}</p>
          <p className="dcw-stage-desc">{currentStep.description}</p>

          {currentStepId === 'EN_ROUTE_SCENE' && enRouteStartedAt && (
            <div className="dcw-en-route-timer">
              <Clock size={16} />
              <span>En route time</span>
              <strong>{enRouteElapsed}</strong>
            </div>
          )}

          {!readOnly && !onDuty && (
            <p className="dcw-warn">Clock in to accept assignments and update mission status.</p>
          )}
          {!readOnly && currentStepId === 'ASSIGNED' && !caseReviewed && (
            <p className="dcw-warn">Review case details before you can accept this assignment.</p>
          )}
          {!readOnly && currentStepId === 'ARRIVED_HOSPITAL' && (
            <p className="dcw-warn">Mission completion is handled by the nurse after clinical handover.</p>
          )}

          {!readOnly && (
          <div className="dcw-action-grid">
            {currentStep.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`dcw-action-btn${action.variant === 'primary' ? ' primary' : ''}${action.variant === 'danger' ? ' danger' : ''}`}
                disabled={
                  (action.id === 'accept' && !caseReviewed) ||
                  (!onDuty &&
                    ['accept', 'mark_arrival', 'start_transport', 'mark_hospital_arrival', 'start_navigation'].includes(
                      action.id,
                    ))
                }
                onClick={() => handleAction(action.id)}
              >
                {action.label}
              </button>
            ))}
          </div>
          )}
        </section>

        <section className="dcw-card dcw-span-2">
          <h3 className="dcw-card-title">Case Details</h3>
          <div className="dcw-info-grid">
            <InfoItem label="Ambulance" value={mission.ambulance?.ambulanceNumber || profile?.assignedAmbulance?.ambulanceNumber} />
            <InfoItem label="Dispatcher" value={mission.dispatcher?.user?.username} />
            <InfoItem label="Priority" value={mission.priority} />
            <InfoItem label="Case type" value={mission.incidentCategory?.name} />
            <InfoItem label="Destination" value={mission.destination || meta.hospital} />
            <InfoItem label="ETA" value={meta.eta ? `${meta.eta} min` : undefined} />
            {mission.completedAt && (
              <InfoItem label="Completed" value={format(new Date(mission.completedAt), 'MMM d, h:mm a')} />
            )}
          </div>
        </section>

        <section className="dcw-card dcw-span-2">
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
      </div>

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
            disabled={Boolean(stickyPrimaryDisabled)}
            onClick={() => handleAction(stickyPrimary.id)}
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
              <h2 className="driver-modal-title">Run Report</h2>
            </div>
            <div className="driver-modal-body mew-form">
              <input className="mew-input" placeholder="Fuel usage (L)" value={reportDraft.fuel} onChange={(e) => setReportDraft((d) => ({ ...d, fuel: e.target.value }))} />
              <input className="mew-input mt-2" placeholder="Mileage (km)" value={reportDraft.mileage} onChange={(e) => setReportDraft((d) => ({ ...d, mileage: e.target.value }))} />
              <textarea className="mew-textarea mt-2" rows={3} placeholder="Notes" value={reportDraft.notes} onChange={(e) => setReportDraft((d) => ({ ...d, notes: e.target.value }))} />
            </div>
            <div className="driver-modal-footer">
              <button type="button" className="driver-btn-sm ghost flex-1" onClick={() => setReportOpen(false)}>Cancel</button>
              <button type="button" className="driver-btn-sm primary flex-1" onClick={submitReport}>Save Report</button>
            </div>
          </div>
        </div>
      )}

      <DriverMissionDetailModal
        missionId={detailId}
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        showAccept={
          Boolean(
            detailId &&
              mission?.status === 'ASSIGNED' &&
              !readOnly &&
              getWorkflowMeta(detailId).reviewedAt,
          )
        }
        onAccept={acceptAssignment}
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
