'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  Activity,
  Building2,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  Navigation,
  Phone,
  Radio,
  RefreshCw,
  Shield,
  Siren,
  Stethoscope,
  Truck,
  User,
  Zap,
} from 'lucide-react'
import { driverMissionsApi } from '@/lib/driverApi'
import { useDriverStore, type DriverMission } from '@/lib/stores/driverStore'
import { useDriverSocket } from '@/lib/useDriverSocket'
import { MissionStatusBadge, PriorityBadge, DriverSkeleton } from '@/components/driver/DriverUI'
import DriverMissionDetailModal from '@/components/driver/DriverMissionDetailModal'
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel'
import { googleMapsUrl, resolvePickupGps } from '@/lib/pickupGps'
import {
  clearStoredPhase,
  getCurrentStep,
  getStepIndex,
  getStepTimestamp,
  getWorkflowMeta,
  MISSION_EXECUTION_STEPS,
  patchWorkflowMeta,
  resolveWorkflowStep,
  setStoredPhase,
  stampWorkflowStage,
  type WorkflowActionId,
  type WorkflowStepId,
} from '@/lib/driver/missionWorkflow'

type DashboardMode = 'assigned' | 'active' | 'workflow'

type Props = {
  /** Page context — controls empty states, banners, and assigned queue */
  mode?: DashboardMode
  /** @deprecated use mode="assigned" */
  showAssignedQueue?: boolean
}

function captureGps(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  })
}

export default function MissionExecutionDashboard({
  mode = 'workflow',
  showAssignedQueue: showAssignedQueueProp,
}: Props) {
  const showAssignedQueue = showAssignedQueueProp ?? mode === 'assigned'
  const isActivePage = mode === 'active'
  const { activeMission, setActiveMission, profile, isSocketConnected } = useDriverStore()
  const { emitMissionStatus, connected: socketConnected } = useDriverSocket()
  const [assignedList, setAssignedList] = useState<DriverMission[]>([])
  const [assignedCount, setAssignedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [panel, setPanel] = useState<'condition' | 'severity' | 'hospital' | 'handover' | 'report' | null>(null)
  const [formDraft, setFormDraft] = useState({
    condition: '',
    severity: 'MEDIUM',
    hospital: '',
    handoverNotes: '',
    signature: '',
    reportNotes: '',
    fuel: '',
    mileage: '',
    eta: '',
  })
  const [liveGps, setLiveGps] = useState<{ lat: number; lng: number } | null>(null)

  const mission = activeMission
  const currentStepId = resolveWorkflowStep(mission)
  const currentStep = getCurrentStep(mission)
  const stepIndex = getStepIndex(currentStepId)
  const progressPct = Math.round(((stepIndex + 1) / MISSION_EXECUTION_STEPS.length) * 100)
  const meta = mission ? getWorkflowMeta(mission.id) : null
  const pickupGps = mission ? resolvePickupGps(mission) : null
  const onDuty = profile?.shiftStatus === 'ON_DUTY'

  const load = useCallback(async () => {
    try {
      const [active, assignedRes] = await Promise.all([
        driverMissionsApi.getActive().catch(() => null),
        showAssignedQueue || isActivePage
          ? driverMissionsApi.getHistory(1, 20, 'ASSIGNED').catch(() => ({ missions: [] }))
          : Promise.resolve({ missions: [] }),
      ])
      setActiveMission(active)
      const assigned = (assignedRes.missions || []).filter((m: DriverMission) => m.status === 'ASSIGNED')
      setAssignedList(assigned)
      setAssignedCount(assigned.length)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [setActiveMission, showAssignedQueue, isActivePage])

  useEffect(() => {
    load()
    const interval = setInterval(load, 20000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    if (!navigator.geolocation) return
    const watch = navigator.geolocation.watchPosition(
      (pos) => setLiveGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000 },
    )
    return () => navigator.geolocation.clearWatch(watch)
  }, [])

  const logActivity = useCallback(
    (message: string) => {
      if (!mission) return
      const notes = { ...(meta?.notes || {}) }
      const key = currentStepId
      notes[key] = [notes[key], `[${format(new Date(), 'HH:mm:ss')}] ${message}`].filter(Boolean).join('\n')
      patchWorkflowMeta(mission.id, { notes })
    },
    [mission, meta, currentStepId],
  )

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
  }

  const advanceStep = async (nextStep: WorkflowStepId, backendStatus?: string, note?: string) => {
    if (!mission) return
    const gps = await captureGps()
    stampWorkflowStage(mission.id, nextStep, gps)
    setStoredPhase(mission.id, nextStep)
    if (backendStatus) await updateBackend(backendStatus, note)
    else logActivity(`Advanced to ${nextStep.replace(/_/g, ' ')}`)
    toast.success(`Stage: ${MISSION_EXECUTION_STEPS.find((s) => s.id === nextStep)?.label}`)
  }

  const handleAction = async (actionId: WorkflowActionId) => {
    if (!mission) return

    switch (actionId) {
      case 'accept':
        await advanceStep('ACCEPTED', 'DISPATCHED', 'Driver accepted assignment')
        setAssignedList((prev) => prev.filter((m) => m.id !== mission.id))
        break
      case 'view_details':
        setDetailId(mission.id)
        break
      case 'start_navigation':
        await advanceStep('EN_ROUTE_SCENE', undefined, 'Driver started navigation to scene')
        if (pickupGps) window.open(googleMapsUrl(pickupGps.lat, pickupGps.lng), '_blank')
        break
      case 'contact_dispatcher':
        toast.success('Connecting to dispatch…')
        break
      case 'open_gps':
        if (pickupGps) window.open(googleMapsUrl(pickupGps.lat, pickupGps.lng), '_blank')
        else toast.error('No GPS coordinates on this case')
        break
      case 'update_eta':
        setPanel(null)
        if (formDraft.eta) {
          patchWorkflowMeta(mission.id, { eta: formDraft.eta })
          logActivity(`ETA updated: ${formDraft.eta}`)
          toast.success('ETA sent to dispatch')
        } else {
          const eta = prompt('Estimated arrival (minutes):')
          if (eta) {
            patchWorkflowMeta(mission.id, { eta })
            logActivity(`ETA updated: ${eta} min`)
            toast.success('ETA sent to dispatch')
          }
        }
        break
      case 'request_backup':
        logActivity('Backup requested')
        toast.success('Backup request sent to dispatch')
        break
      case 'report_delay':
        logActivity('Delay reported')
        toast('Delay reported to dispatch', { icon: '⚠️' })
        break
      case 'mark_arrival':
        await advanceStep('ARRIVED_SCENE', 'ARRIVED_SCENE', 'Driver arrived at scene')
        break
      case 'notify_dispatcher':
        logActivity('Scene arrival notified')
        toast.success('Dispatch notified of scene arrival')
        break
      case 'record_condition':
        setPanel('condition')
        break
      case 'select_severity':
        setPanel('severity')
        break
      case 'select_hospital':
        setPanel('hospital')
        break
      case 'advance':
        if (currentStepId === 'ARRIVED_SCENE') await advanceStep('PATIENT_ASSESSMENT')
        else if (currentStepId === 'ARRIVED_HOSPITAL') await advanceStep('PATIENT_HANDOVER')
        break
      case 'confirm_onboard':
        logActivity('Patient confirmed on board')
        toast.success('Patient on board confirmed')
        break
      case 'start_transport':
        await advanceStep('EN_ROUTE_HOSPITAL', 'TRANSPORTING', 'Transport to hospital started')
        break
      case 'navigate_hospital':
        if (mission.destination) {
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mission.destination)}`, '_blank')
        } else toast.error('Destination hospital not set')
        break
      case 'share_location':
        if (liveGps) {
          await navigator.clipboard.writeText(googleMapsUrl(liveGps.lat, liveGps.lng))
          logActivity(`Live location shared: ${liveGps.lat.toFixed(5)}, ${liveGps.lng.toFixed(5)}`)
          toast.success('Live location link copied')
        } else toast.error('GPS not available')
        break
      case 'send_eta_hospital':
        logActivity(`ETA to hospital: ${meta?.eta || 'pending'}`)
        toast.success('ETA sent to receiving hospital')
        break
      case 'mark_hospital_arrival':
        await advanceStep('ARRIVED_HOSPITAL', 'ARRIVED_HOSPITAL', 'Arrived at hospital')
        break
      case 'notify_hospital':
        logActivity('Receiving hospital notified')
        toast.success('Hospital notified')
        break
      case 'complete_handover':
        setPanel('handover')
        break
      case 'capture_signature':
        setPanel('handover')
        break
      case 'upload_notes':
        setPanel('handover')
        break
      case 'submit_report':
        setPanel('report')
        break
      case 'record_fuel':
        setPanel('report')
        break
      case 'record_mileage':
        setPanel('report')
        break
      case 'mark_available':
        await advanceStep('MISSION_COMPLETED', 'COMPLETED', 'Mission completed')
        clearStoredPhase(mission.id)
        toast.success('Mission completed — you are available for new assignments')
        load()
        break
      default:
        break
    }
  }

  const submitPanel = async () => {
    if (!mission) return
    if (panel === 'condition') {
      patchWorkflowMeta(mission.id, { notes: { ...meta?.notes, PATIENT_ASSESSMENT: formDraft.condition } })
      logActivity(`Condition recorded: ${formDraft.condition.slice(0, 80)}`)
      await advanceStep('PATIENT_ASSESSMENT')
      setPanel(null)
    } else if (panel === 'severity') {
      patchWorkflowMeta(mission.id, { severity: formDraft.severity })
      logActivity(`Severity set: ${formDraft.severity}`)
      toast.success('Severity level saved')
      setPanel(null)
    } else if (panel === 'hospital') {
      patchWorkflowMeta(mission.id, { hospital: formDraft.hospital })
      logActivity(`Destination: ${formDraft.hospital}`)
      await advanceStep('PATIENT_LOADED')
      setPanel(null)
    } else if (panel === 'handover') {
      patchWorkflowMeta(mission.id, {
        signature: formDraft.signature,
        notes: { ...meta?.notes, PATIENT_HANDOVER: formDraft.handoverNotes },
      })
      logActivity('Handover documentation completed')
      await advanceStep('MISSION_COMPLETED', 'COMPLETED', 'Patient handover complete')
      clearStoredPhase(mission.id)
      setPanel(null)
      load()
    } else if (panel === 'report') {
      patchWorkflowMeta(mission.id, { fuel: formDraft.fuel, mileage: formDraft.mileage })
      logActivity('Mission report submitted')
      toast.success('Mission report saved')
      setPanel(null)
    }
  }

  const activityLog = useMemo(() => {
    if (!mission) return []
    const entries: Array<{ time: string; text: string }> = []
    mission.statusLogs?.forEach((log) => {
      entries.push({
        time: format(new Date(log.createdAt), 'MMM d, h:mm a'),
        text: `Status → ${log.toStatus}${log.notes ? `: ${log.notes}` : ''}`,
      })
    })
    if (meta?.notes) {
      Object.entries(meta.notes).forEach(([step, note]) => {
        note.split('\n').forEach((line) => {
          if (line.trim()) entries.push({ time: step, text: line })
        })
      })
    }
    return entries.reverse().slice(0, 12)
  }, [mission, meta])

  if (loading) {
    return (
      <div className="driver-card">
        <DriverSkeleton lines={8} />
      </div>
    )
  }

  if (!mission && showAssignedQueue && assignedList.length > 0) {
    return (
      <>
        <div className="mew-assigned-banner">
          <Siren size={18} />
          <span>{assignedList.length} pending assignment{assignedList.length > 1 ? 's' : ''}</span>
        </div>
        <div className="driver-list-stack">
          {assignedList.map((m) => (
            <AssignedMissionCard
              key={m.id}
              mission={m}
              onAccept={async () => {
                setActiveMission(m)
                await driverMissionsApi.updateStatus(m.id, 'DISPATCHED', 'Driver accepted assignment')
                setStoredPhase(m.id, 'ACCEPTED')
                stampWorkflowStage(m.id, 'ACCEPTED')
                setAssignedList((prev) => prev.filter((x) => x.id !== m.id))
                await refreshMission(m.id)
                toast.success('Assignment accepted — workflow started')
              }}
              onDetails={() => setDetailId(m.id)}
            />
          ))}
        </div>
        <DriverMissionDetailModal
          missionId={detailId}
          open={Boolean(detailId)}
          onClose={() => setDetailId(null)}
          showAccept
          onAccept={async (id) => {
            const m = assignedList.find((x) => x.id === id)
            if (m) {
              setActiveMission(m)
              await driverMissionsApi.updateStatus(id, 'DISPATCHED', 'Driver accepted assignment')
              setStoredPhase(id, 'ACCEPTED')
              stampWorkflowStage(id, 'ACCEPTED')
              setAssignedList((prev) => prev.filter((x) => x.id !== id))
              await refreshMission(id)
            }
            setDetailId(null)
          }}
        />
      </>
    )
  }

  if (!mission) {
    return (
      <div className="mew-empty-state">
        <div className="mew-empty-icon">
          <Siren size={32} />
        </div>
        <h3>{isActivePage ? 'No Active Mission' : 'No Mission in Progress'}</h3>
        <p>
          {isActivePage
            ? 'Accept an assignment or wait for dispatch to assign you a case. Your live workflow will appear here once a mission is active.'
            : 'New assignments will appear here with the full execution workflow.'}
        </p>
        {assignedCount > 0 && (
          <Link href="/driver/missions/assigned" className="driver-btn-sm primary mew-empty-cta">
            {assignedCount} Pending Assignment{assignedCount > 1 ? 's' : ''} — Review Now
          </Link>
        )}
        <Link href="/driver/missions/assigned" className="driver-btn-sm ghost">
          Go to Assigned Missions
        </Link>
        {isActivePage && (
          <Link href="/driver/shifts" className="driver-btn-sm ghost mt-2">
            Clock In / Shift Status
          </Link>
        )}
      </div>
    )
  }

  const stepTimestamp = getStepTimestamp(mission, currentStepId)
  const stepGps = meta?.gps[currentStepId] || liveGps
  const primaryAction = currentStep.actions.find((a) => a.variant === 'primary')
  const liveConnected = socketConnected || isSocketConnected
  const heroKicker = isActivePage ? 'Active Mission · Live Ops' : 'Mission Execution · Live'

  return (
    <>
      <div className={`mew-dashboard${isActivePage ? ' mew-dashboard--active' : ''}`}>
        {/* Active page status strip */}
        {isActivePage && (
          <div className="mew-active-topbar">
            <span className={`mew-status-chip${onDuty ? ' on-duty' : ' off-duty'}`}>
              {onDuty ? '● On Duty' : '○ Clock In Required'}
            </span>
            <span className={`mew-status-chip${liveConnected ? ' live' : ''}`}>
              {liveConnected ? '● Live Sync' : '○ Offline'}
            </span>
            {liveGps && (
              <span className="mew-status-chip gps">
                <MapPin size={12} /> GPS {liveGps.lat.toFixed(4)}, {liveGps.lng.toFixed(4)}
              </span>
            )}
            {!onDuty && (
              <Link href="/driver/shifts" className="mew-status-link">
                Clock in →
              </Link>
            )}
          </div>
        )}

        {isActivePage && assignedCount > 0 && mission.status !== 'ASSIGNED' && (
          <Link href="/driver/missions/assigned" className="mew-pending-alert">
            <Siren size={16} />
            {assignedCount} more assignment{assignedCount > 1 ? 's' : ''} waiting in queue
            <ChevronRight size={16} />
          </Link>
        )}

        {/* Hero status bar */}
        <header className="mew-hero">
          <div className="mew-hero-left">
            <p className="mew-hero-kicker">{heroKicker}</p>
            <h1 className="mew-hero-code">{mission.trackingCode}</h1>
            <div className="mew-hero-badges">
              <MissionStatusBadge status={mission.status} />
              <PriorityBadge priority={mission.priority} />
              <span className="mew-stage-pill">{currentStep.label}</span>
            </div>
          </div>
          <div className="mew-hero-right">
            <div className="mew-progress-ring" style={{ '--pct': progressPct } as React.CSSProperties}>
              <span>{progressPct}%</span>
            </div>
            <button
              type="button"
              className="mew-refresh-btn"
              onClick={() => { setRefreshing(true); load() }}
              aria-label="Refresh"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            {isActivePage && (
              <button
                type="button"
                className="mew-refresh-btn"
                onClick={() => setDetailId(mission.id)}
                aria-label="View details"
                title="View case details"
              >
                <FileText size={16} />
              </button>
            )}
          </div>
        </header>

        {/* Progress bar */}
        <div className="mew-progress-track">
          <div className="mew-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Timeline */}
        <section className="mew-card mew-timeline-card">
          <h2 className="mew-card-title">
            <Activity size={16} /> Live Mission Timeline
          </h2>
          <ol className="mew-timeline">
            {MISSION_EXECUTION_STEPS.map((step, idx) => {
              const done = idx < stepIndex
              const active = idx === stepIndex
              const ts = getStepTimestamp(mission, step.id)
              return (
                <li key={step.id} className={`mew-timeline-item${done ? ' done' : ''}${active ? ' active' : ''}`}>
                  <div className="mew-timeline-dot">{done ? '✓' : idx + 1}</div>
                  <div className="mew-timeline-body">
                    <p className="mew-timeline-label">{step.label}</p>
                    {active && <p className="mew-timeline-desc">{step.description}</p>}
                    {ts && <p className="mew-timeline-time"><Clock size={11} /> {format(new Date(ts), 'MMM d, h:mm a')}</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        <div className="mew-grid">
          {/* Current stage actions */}
          <section className="mew-card mew-stage-card">
            <h2 className="mew-card-title">
              <Zap size={16} /> Current Stage — {currentStep.label}
            </h2>
            {stepTimestamp && (
              <p className="mew-stage-meta">
                <Clock size={13} /> {format(new Date(stepTimestamp), 'MMM d, yyyy h:mm a')}
              </p>
            )}
            {stepGps && (
              <p className="mew-stage-meta">
                <MapPin size={13} /> GPS {stepGps.lat.toFixed(5)}, {stepGps.lng.toFixed(5)}
              </p>
            )}
            <div className="mew-action-grid">
              {currentStep.actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={`mew-action-btn ${action.variant || 'secondary'}`}
                  onClick={() => handleAction(action.id)}
                  disabled={!onDuty && ['accept', 'mark_arrival', 'start_transport', 'mark_hospital_arrival', 'mark_available'].includes(action.id)}
                >
                  {action.label}
                </button>
              ))}
            </div>
            {!onDuty && (
              <p className="driver-warning-text mt-3">Clock in to execute workflow actions.</p>
            )}
          </section>

          {/* Communication */}
          <section className="mew-card">
            <h2 className="mew-card-title">
              <Radio size={16} /> Communication Center
            </h2>
            <div className="mew-comm-grid">
              <a href={`tel:${mission.patient?.phone || ''}`} className="mew-comm-btn">
                <Phone size={16} /> Call Patient
              </a>
              <button type="button" className="mew-comm-btn" onClick={() => handleAction('contact_dispatcher')}>
                <Radio size={16} /> Contact Dispatcher
              </button>
              <button type="button" className="mew-comm-btn" onClick={() => handleAction('notify_dispatcher')}>
                <Shield size={16} /> Notify Dispatch
              </button>
              <Link href="/driver/incidents/new" className="mew-comm-btn danger">
                <FileText size={16} /> Report Incident
              </Link>
            </div>
          </section>

          {/* Incident info */}
          <section className="mew-card">
            <h2 className="mew-card-title">
              <Siren size={16} /> Incident Information
            </h2>
            <InfoGrid
              rows={[
                { label: 'Case ID', value: mission.trackingCode },
                { label: 'Priority', value: mission.priority },
                { label: 'Case Type', value: mission.incidentCategory?.name },
                { label: 'Location', value: mission.pickupLocation },
                { label: 'Landmark', value: mission.pickupLandmark },
                { label: 'Region', value: [mission.region?.name, mission.district?.name].filter(Boolean).join(' · ') },
              ]}
            />
            <div className="mt-3">
              <PickupGpsPanel request={mission} tone="dark" title="Dispatcher-shared GPS" />
            </div>
          </section>

          {/* Patient */}
          <section className="mew-card">
            <h2 className="mew-card-title">
              <User size={16} /> Patient Information
            </h2>
            <InfoGrid
              rows={[
                { label: 'Name', value: mission.patient?.fullName },
                { label: 'Phone', value: mission.patient?.phone },
                { label: 'Age / Gender', value: [mission.patient?.age, mission.patient?.gender].filter(Boolean).join(' · ') },
                { label: 'Condition', value: mission.patientCondition || meta?.notes?.PATIENT_ASSESSMENT },
                { label: 'Severity', value: meta?.severity },
              ]}
            />
          </section>

          {/* Ambulance */}
          <section className="mew-card">
            <h2 className="mew-card-title">
              <Truck size={16} /> Ambulance Information
            </h2>
            <InfoGrid
              rows={[
                { label: 'Unit', value: mission.ambulance?.ambulanceNumber || profile?.assignedAmbulance?.ambulanceNumber },
                { label: 'Plate', value: mission.ambulance?.plateNumber || profile?.assignedAmbulance?.plateNumber },
                { label: 'Type', value: mission.ambulance?.vehicleType },
                { label: 'Dispatcher', value: mission.dispatcher?.user?.username },
                { label: 'Assigned', value: mission.assignedAt ? format(new Date(mission.assignedAt), 'MMM d, h:mm a') : undefined },
              ]}
            />
          </section>

          {/* Hospital */}
          <section className="mew-card">
            <h2 className="mew-card-title">
              <Building2 size={16} /> Hospital Destination
            </h2>
            <InfoGrid
              rows={[
                { label: 'Destination', value: meta?.hospital || mission.destination || 'To be confirmed' },
                { label: 'ETA', value: meta?.eta ? `${meta.eta} min` : '—' },
              ]}
            />
            {stepIndex >= getStepIndex('EN_ROUTE_HOSPITAL') && (
              <button type="button" className="mew-action-btn primary mt-3 w-full" onClick={() => handleAction('navigate_hospital')}>
                <Navigation size={14} /> Navigate to Hospital
              </button>
            )}
          </section>

          {/* Activity log */}
          <section className="mew-card mew-span-2">
            <h2 className="mew-card-title">
              <FileText size={16} /> Mission Activity Log
            </h2>
            <ul className="mew-activity-log">
              {activityLog.length === 0 && <li className="mew-activity-empty">No activity yet</li>}
              {activityLog.map((entry, i) => (
                <li key={i}>
                  <span className="mew-activity-time">{entry.time}</span>
                  <span className="mew-activity-text">{entry.text}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Completion summary */}
          {stepIndex >= getStepIndex('MISSION_COMPLETED') - 1 && (
            <section className="mew-card mew-span-2 mew-completion">
              <h2 className="mew-card-title">
                <Stethoscope size={16} /> Mission Completion Summary
              </h2>
              <InfoGrid
                rows={[
                  { label: 'Fuel usage', value: meta?.fuel || '—' },
                  { label: 'Mileage', value: meta?.mileage || '—' },
                  { label: 'Handover signature', value: meta?.signature || '—' },
                  { label: 'Completed', value: mission.completedAt ? format(new Date(mission.completedAt), 'MMM d, h:mm a') : 'In progress' },
                ]}
              />
            </section>
          )}
        </div>
      </div>

      {/* Mobile sticky primary action — Active Mission */}
      {isActivePage && primaryAction && (
        <div className="mew-sticky-action">
          <button
            type="button"
            className="mew-sticky-btn secondary"
            onClick={() => handleAction('open_gps')}
          >
            <Navigation size={18} />
          </button>
          <button
            type="button"
            className="mew-sticky-btn primary"
            onClick={() => handleAction(primaryAction.id)}
            disabled={!onDuty && ['accept', 'mark_arrival', 'start_transport', 'mark_hospital_arrival', 'mark_available', 'advance'].includes(primaryAction.id)}
          >
            {primaryAction.label}
          </button>
          <button
            type="button"
            className="mew-sticky-btn secondary"
            onClick={() => setDetailId(mission.id)}
          >
            <FileText size={18} />
          </button>
        </div>
      )}

      {/* Inline form panel */}
      {panel && (
        <div className="driver-modal-overlay" role="dialog">
          <button type="button" className="driver-modal-backdrop" onClick={() => setPanel(null)} aria-label="Close" />
          <div className="driver-modal-panel">
            <div className="driver-modal-header">
              <h2 className="driver-modal-title">
                {panel === 'condition' && 'Record Patient Condition'}
                {panel === 'severity' && 'Select Severity Level'}
                {panel === 'hospital' && 'Destination Hospital'}
                {panel === 'handover' && 'Patient Handover'}
                {panel === 'report' && 'Mission Report'}
              </h2>
            </div>
            <div className="driver-modal-body mew-form">
              {panel === 'condition' && (
                <textarea
                  className="mew-textarea"
                  rows={4}
                  placeholder="Describe patient condition, vitals, consciousness…"
                  value={formDraft.condition}
                  onChange={(e) => setFormDraft((d) => ({ ...d, condition: e.target.value }))}
                />
              )}
              {panel === 'severity' && (
                <select
                  className="mew-select"
                  value={formDraft.severity}
                  onChange={(e) => setFormDraft((d) => ({ ...d, severity: e.target.value }))}
                >
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
              {panel === 'hospital' && (
                <input
                  className="mew-input"
                  placeholder="Hospital name / destination"
                  value={formDraft.hospital}
                  onChange={(e) => setFormDraft((d) => ({ ...d, hospital: e.target.value }))}
                />
              )}
              {panel === 'handover' && (
                <>
                  <textarea
                    className="mew-textarea"
                    rows={3}
                    placeholder="Handover notes for receiving staff"
                    value={formDraft.handoverNotes}
                    onChange={(e) => setFormDraft((d) => ({ ...d, handoverNotes: e.target.value }))}
                  />
                  <input
                    className="mew-input mt-2"
                    placeholder="Digital signature (type full name)"
                    value={formDraft.signature}
                    onChange={(e) => setFormDraft((d) => ({ ...d, signature: e.target.value }))}
                  />
                </>
              )}
              {panel === 'report' && (
                <>
                  <input className="mew-input" placeholder="Fuel usage (L)" value={formDraft.fuel} onChange={(e) => setFormDraft((d) => ({ ...d, fuel: e.target.value }))} />
                  <input className="mew-input mt-2" placeholder="Mileage (km)" value={formDraft.mileage} onChange={(e) => setFormDraft((d) => ({ ...d, mileage: e.target.value }))} />
                  <textarea className="mew-textarea mt-2" rows={3} placeholder="Mission report notes" value={formDraft.reportNotes} onChange={(e) => setFormDraft((d) => ({ ...d, reportNotes: e.target.value }))} />
                </>
              )}
            </div>
            <div className="driver-modal-footer">
              <button type="button" className="driver-btn-sm ghost flex-1" onClick={() => setPanel(null)}>Cancel</button>
              <button type="button" className="driver-btn-sm primary flex-1" onClick={submitPanel}>Save & Continue</button>
            </div>
          </div>
        </div>
      )}

      <DriverMissionDetailModal
        missionId={detailId}
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
      />
    </>
  )
}

function AssignedMissionCard({
  mission,
  onAccept,
  onDetails,
}: {
  mission: DriverMission
  onAccept: () => void
  onDetails: () => void
}) {
  return (
    <div className="driver-mission-list-card mew-assigned-card">
      <div className="driver-mlc-top">
        <span className="driver-mlc-code">{mission.trackingCode}</span>
        <div className="driver-mlc-badges">
          <MissionStatusBadge status="ASSIGNED" />
          <PriorityBadge priority={mission.priority} />
        </div>
      </div>
      <div className="driver-mlc-row">
        <MapPin size={13} />
        <span>{mission.pickupLocation}</span>
      </div>
      <div className="driver-mlc-row">
        <PickupGpsPanel request={mission} variant="compact" tone="dark" />
      </div>
      <div className="driver-mlc-row">
        <Clock size={13} />
        <span>
          Assigned {mission.assignedAt ? format(new Date(mission.assignedAt), 'MMM d, h:mm a') : '—'}
        </span>
      </div>
      <div className="driver-assigned-actions">
        <button type="button" className="driver-btn-sm primary" onClick={onAccept}>
          Accept Assignment
        </button>
        <button type="button" className="driver-btn-sm ghost" onClick={onDetails}>
          View Details <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

function InfoGrid({ rows }: { rows: Array<{ label: string; value?: string | null }> }) {
  return (
    <dl className="mew-info-grid">
      {rows.filter((r) => r.value).map((row) => (
        <div key={row.label} className="mew-info-item">
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
