'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { io, Socket } from 'socket.io-client'
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Circle,
  Activity,
  Stethoscope,
  Truck,
  MessageSquare,
  ClipboardList,
} from 'lucide-react'
import { hospitalAppApi } from '@/lib/hospital/hospitalApi'

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:3001'
).replace(/\/$/, '')

type MissionCase = {
  id: string
  caseNumber: string
  status: string
  stage: string
  priority: string
  notes?: string | null
  preparation?: Record<string, unknown> | null
  mission?: {
    estimatedArrival?: string | null
    missionStatus?: string
    missionProgress?: { key: string; label: string; completed: boolean; current: boolean }[]
    dispatchTime?: string
    dispatcherName?: string
    trackingCode?: string
  }
  patient?: Record<string, unknown>
  clinical?: {
    chiefComplaint?: string
    symptoms?: string
    injuryDescription?: string
    assessmentNotes?: string
    latestVitals?: Record<string, unknown> | null
    notesTimeline?: { id: string; time: string; author: string; text: string }[]
    treatments?: { time: string; label: string }[]
  }
  team?: Record<string, unknown>
  communications?: { id: string; time: string; role: string; author: string; message: string }[]
  emergencyRequest?: { incidentCategory?: { name?: string } }
}

const PREP_DEFAULT = {
  department: '',
  receivingDoctor: '',
  receivingNurse: '',
  bedReserved: false,
  icuReserved: false,
  teamPrepared: false,
  teamReady: false,
}

export default function HospitalMissionCaseView({ caseId }: { caseId: string }) {
  const router = useRouter()
  const [data, setData] = useState<MissionCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [prep, setPrep] = useState(PREP_DEFAULT)
  const [savingPrep, setSavingPrep] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await hospitalAppApi.getCase(caseId)
      setData(res)
      if (res?.preparation) {
        setPrep({ ...PREP_DEFAULT, ...(res.preparation as typeof PREP_DEFAULT) })
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load case')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    if (!data?.mission?.trackingCode) return
    let socket: Socket | undefined

    socket = io(BACKEND_URL, { transports: ['websocket', 'polling'] })
    socket.on('connect', () => {
      socket?.emit('join-tracking', data.mission!.trackingCode)
    })
    socket.on('tracking-update', () => load())

    return () => {
      socket?.disconnect()
    }
  }, [data?.mission?.trackingCode, load])

  const savePreparation = async () => {
    setSavingPrep(true)
    try {
      await hospitalAppApi.updatePreparation(caseId, prep)
      toast.success('Preparation saved')
      load()
    } catch {
      toast.error('Could not save preparation')
    } finally {
      setSavingPrep(false)
    }
  }

  const accept = async () => {
    const staff = prompt('Receiving staff name (optional):') || undefined
    try {
      await hospitalAppApi.acceptCase(caseId, staff)
      toast.success('Case accepted')
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Accept failed')
    }
  }

  const reject = async () => {
    const notes = prompt('Rejection reason:')
    if (!notes) return
    try {
      await hospitalAppApi.rejectCase(caseId, 'NO_BEDS', notes)
      toast.success('Case rejected')
      router.push('/hospital/emergency-cases?tab=rejected')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Reject failed')
    }
  }

  if (loading && !data) {
    return (
      <div className="hosp-loading">
        <Loader2 className="animate-spin" size={28} />
      </div>
    )
  }

  if (!data) {
    return <div className="hosp-empty">Case not found.</div>
  }

  const vitals = data.clinical?.latestVitals as Record<string, unknown> | null | undefined
  const eta = data.mission?.estimatedArrival?.replace(' mins', ' Minutes') ?? '—'

  return (
    <div className="hosp-mission">
      <div className="hosp-mission-toolbar">
        <Link href="/hospital/emergency-cases" className="hosp-btn ghost">
          <ArrowLeft size={16} /> Back to cases
        </Link>
        <div className="hosp-mission-toolbar-actions">
          {data.stage === 'INCOMING' && data.status === 'PENDING_REVIEW' && (
            <>
              <button type="button" className="hosp-btn primary" onClick={accept}>
                Accept Case
              </button>
              <button type="button" className="hosp-btn ghost" onClick={reject}>
                Reject
              </button>
            </>
          )}
          <button type="button" className="hosp-icon-btn" onClick={load} title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="hosp-mission-hero">
        <div>
          <p className="hosp-mission-kicker">Incoming Mission</p>
          <h2 className="hosp-mission-title">{data.caseNumber}</h2>
          <p className="hosp-mission-sub">
            Tracking: {data.mission?.trackingCode ?? '—'} ·{' '}
            {data.emergencyRequest?.incidentCategory?.name ?? 'Emergency'}
          </p>
        </div>
        <div className="hosp-mission-hero-badges">
          <span className={`hosp-priority ${data.priority?.toLowerCase()}`}>{data.priority}</span>
          <span className="hosp-status-pill">{data.mission?.missionStatus ?? data.status}</span>
          <span className="hosp-eta-pill">ETA: {eta}</span>
        </div>
      </div>

      <div className="hosp-mission-grid">
        <section className="hosp-card">
          <h3><ClipboardList size={16} /> Case Information</h3>
          <dl className="hosp-dl">
            <div><dt>Case ID</dt><dd className="mono">{data.caseNumber}</dd></div>
            <div><dt>Priority</dt><dd>{data.priority}</dd></div>
            <div><dt>Incident Category</dt><dd>{data.emergencyRequest?.incidentCategory?.name ?? '—'}</dd></div>
            <div><dt>Case Status</dt><dd>{data.status?.replace(/_/g, ' ')}</dd></div>
            <div><dt>Dispatcher</dt><dd>{data.mission?.dispatcherName ?? '—'}</dd></div>
            <div>
              <dt>Dispatch Time</dt>
              <dd>
                {data.mission?.dispatchTime
                  ? format(new Date(data.mission.dispatchTime), 'PPp')
                  : '—'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="hosp-card">
          <h3><Stethoscope size={16} /> Patient Information</h3>
          <dl className="hosp-dl">
            <div><dt>Name</dt><dd>{String(data.patient?.name ?? '—')}</dd></div>
            <div><dt>Age</dt><dd>{data.patient?.age != null ? String(data.patient.age) : '—'}</dd></div>
            <div><dt>Gender</dt><dd>{String(data.patient?.gender ?? '—')}</dd></div>
            <div><dt>Blood Type</dt><dd>{String(data.patient?.bloodType ?? '—')}</dd></div>
            <div><dt>Condition</dt><dd>{String(data.patient?.condition ?? '—')}</dd></div>
            <div><dt>Current Status</dt><dd>{String(data.patient?.currentStatus ?? '—')}</dd></div>
          </dl>
        </section>

        <section className="hosp-card">
          <h3><Truck size={16} /> Mission Information</h3>
          <dl className="hosp-dl">
            <div><dt>Ambulance</dt><dd>{String(data.team?.ambulanceId ?? '—')}</dd></div>
            <div><dt>Driver</dt><dd>{String(data.team?.driverName ?? '—')}</dd></div>
            <div><dt>Nurse</dt><dd>{String(data.team?.nurseName ?? '—')}</dd></div>
            <div><dt>Mission Status</dt><dd>{data.mission?.missionStatus ?? '—'}</dd></div>
            <div><dt>Estimated Arrival</dt><dd className="hosp-eta-value">{eta}</dd></div>
          </dl>
        </section>

        <section className="hosp-card hosp-card-wide">
          <h3><Activity size={16} /> Ambulance Tracking</h3>
          <div className="hosp-progress-steps">
            {(data.mission?.missionProgress ?? []).map((step) => (
              <div
                key={step.key}
                className={`hosp-progress-step${step.completed ? ' done' : ''}${step.current ? ' current' : ''}`}
              >
                {step.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                <span>{step.label}</span>
              </div>
            ))}
          </div>
          <p className="hosp-muted">
            Status updates are entered manually by driver/dispatcher. Refreshes automatically every 15 seconds.
          </p>
        </section>

        <section className="hosp-card hosp-card-wide">
          <h3><Stethoscope size={16} /> Nurse Clinical Information</h3>
          <div className="hosp-clinical-grid">
            <div>
              <h4>Patient Assessment</h4>
              <dl className="hosp-dl compact">
                <div><dt>Chief Complaint</dt><dd>{data.clinical?.chiefComplaint ?? '—'}</dd></div>
                <div><dt>Symptoms</dt><dd>{data.clinical?.symptoms ?? '—'}</dd></div>
                <div><dt>Injury Description</dt><dd>{data.clinical?.injuryDescription ?? '—'}</dd></div>
                <div><dt>Assessment Notes</dt><dd>{data.clinical?.assessmentNotes ?? '—'}</dd></div>
              </dl>
            </div>
            <div>
              <h4>Latest Vital Signs</h4>
              {vitals ? (
                <dl className="hosp-dl compact">
                  <div><dt>Blood Pressure</dt><dd>{String(vitals.bloodPressure ?? '—')}</dd></div>
                  <div><dt>Pulse</dt><dd>{vitals.pulse != null ? String(vitals.pulse) : '—'}</dd></div>
                  <div><dt>Temperature</dt><dd>{vitals.temperature != null ? String(vitals.temperature) : '—'}</dd></div>
                  <div><dt>Respiratory Rate</dt><dd>{vitals.respiratoryRate != null ? String(vitals.respiratoryRate) : '—'}</dd></div>
                  <div><dt>Oxygen Saturation</dt><dd>{vitals.oxygenSaturation != null ? `${vitals.oxygenSaturation}%` : '—'}</dd></div>
                </dl>
              ) : (
                <p className="hosp-muted">No vitals recorded yet.</p>
              )}
            </div>
          </div>

          <h4 className="hosp-section-sub">Medical Notes Timeline</h4>
          {(data.clinical?.notesTimeline?.length ?? 0) === 0 ? (
            <p className="hosp-muted">No nurse notes yet.</p>
          ) : (
            <ul className="hosp-timeline">
              {data.clinical!.notesTimeline!.map((n) => (
                <li key={n.id}>
                  <time>{format(new Date(n.time), 'p')}</time>
                  <p>{n.text}</p>
                  <span>{n.author}</span>
                </li>
              ))}
            </ul>
          )}

          <h4 className="hosp-section-sub">Treatment Records</h4>
          {(data.clinical?.treatments?.length ?? 0) === 0 ? (
            <p className="hosp-muted">No treatments recorded yet.</p>
          ) : (
            <ul className="hosp-treatment-list">
              {data.clinical!.treatments!.map((t, i) => (
                <li key={`${t.label}-${i}`}>
                  <span>{t.label}</span>
                  <time>{format(new Date(t.time), 'p')}</time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="hosp-card">
          <h3>Hospital Preparation Panel</h3>
          <div className="hosp-prep-form">
            <label>
              Assign Department
              <input
                value={prep.department}
                onChange={(e) => setPrep({ ...prep, department: e.target.value })}
                placeholder="e.g. Emergency Department"
              />
            </label>
            <label>
              Receiving Doctor
              <input
                value={prep.receivingDoctor}
                onChange={(e) => setPrep({ ...prep, receivingDoctor: e.target.value })}
              />
            </label>
            <label>
              Receiving Nurse
              <input
                value={prep.receivingNurse}
                onChange={(e) => setPrep({ ...prep, receivingNurse: e.target.value })}
              />
            </label>
            <label className="hosp-check">
              <input
                type="checkbox"
                checked={prep.bedReserved}
                onChange={(e) => setPrep({ ...prep, bedReserved: e.target.checked })}
              />
              Reserve Bed
            </label>
            <label className="hosp-check">
              <input
                type="checkbox"
                checked={prep.icuReserved}
                onChange={(e) => setPrep({ ...prep, icuReserved: e.target.checked })}
              />
              Reserve ICU Bed
            </label>
            <label className="hosp-check">
              <input
                type="checkbox"
                checked={prep.teamPrepared}
                onChange={(e) => setPrep({ ...prep, teamPrepared: e.target.checked })}
              />
              Prepare Emergency Team
            </label>
            <label className="hosp-check">
              <input
                type="checkbox"
                checked={prep.teamReady}
                onChange={(e) => setPrep({ ...prep, teamReady: e.target.checked })}
              />
              Receiving Team Ready
            </label>
            <button type="button" className="hosp-btn primary" disabled={savingPrep} onClick={savePreparation}>
              {savingPrep ? 'Saving…' : 'Save Preparation'}
            </button>
            {prep.teamReady && <p className="hosp-ready-banner">Receiving Team Ready</p>}
          </div>
        </section>

        <section className="hosp-card hosp-card-wide">
          <h3><MessageSquare size={16} /> Mission Communication</h3>
          {(data.communications?.length ?? 0) === 0 ? (
            <p className="hosp-muted">No messages yet. Updates from dispatcher, driver, and nurse appear here.</p>
          ) : (
            <ul className="hosp-chat">
              {data.communications!.map((m) => (
                <li key={m.id} className={`hosp-chat-item role-${m.role.toLowerCase()}`}>
                  <div className="hosp-chat-meta">
                    <strong>{m.role}</strong>
                    <span>{m.author}</span>
                    <time>{format(new Date(m.time), 'PPp')}</time>
                  </div>
                  <p>{m.message}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
