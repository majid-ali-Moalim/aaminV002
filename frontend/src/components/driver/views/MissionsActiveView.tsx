'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useDriverStore } from '@/lib/stores/driverStore'
import { useDriverSocket } from '@/lib/useDriverSocket'
import { driverMissionsApi } from '@/lib/driverApi'
import { MissionStatusBadge, PriorityBadge, DriverSkeleton } from '@/components/driver/DriverUI'
import { DriverPanel } from '@/components/driver/DriverModuleShell'
import toast from 'react-hot-toast'
import {
  MapPin, User, ArrowRight, AlertTriangle, CheckCircle, Phone, FileText,
} from 'lucide-react'
import { format } from 'date-fns'

const NEXT_ACTIONS: Record<string, { label: string; status: string; cls: string }> = {
  ASSIGNED: { label: 'Accept & Start Journey', status: 'DISPATCHED', cls: 'btn-orange' },
  DISPATCHED: { label: 'Arrived at Pickup', status: 'ON_SCENE', cls: 'btn-blue' },
  ON_SCENE: { label: 'Patient Onboard', status: 'TRANSPORTING', cls: 'btn-cyan' },
  TRANSPORTING: { label: 'Arrived at Hospital', status: 'ARRIVED_HOSPITAL', cls: 'btn-purple' },
  ARRIVED_HOSPITAL: { label: 'Complete Mission', status: 'COMPLETED', cls: 'btn-green' },
}

export default function MissionsActiveView() {
  const { activeMission, setActiveMission, profile } = useDriverStore()
  const { emitMissionStatus } = useDriverSocket()
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const m = await driverMissionsApi.getActive()
      setActiveMission(m)
    } catch (_) {}
    setLoading(false)
  }, [setActiveMission])

  useEffect(() => { load() }, [load])

  const onDuty = profile?.shiftStatus === 'ON_DUTY'
  const nextAction = activeMission ? NEXT_ACTIONS[activeMission.status] : null

  const handleAction = async () => {
    if (!activeMission || !nextAction) return
    if (!onDuty) {
      toast.error('You must clock in before updating mission status')
      return
    }
    try {
      await driverMissionsApi.updateStatus(activeMission.id, nextAction.status)
      emitMissionStatus(activeMission.id, nextAction.status)
      toast.success(`Status: ${nextAction.label}`)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update status')
    }
  }

  if (loading) return <div className="driver-card"><DriverSkeleton lines={6} /></div>

  if (!activeMission) {
    return (
      <DriverPanel title="Active Mission" empty="No active mission. You will be notified when assigned." />
    )
  }

  const m = activeMission

  return (
    <div className="driver-active-mission-card">
      <div className="driver-mission-card-header">
        <div className="driver-mission-card-icon">🚨</div>
        <div>
          <p className="driver-mission-tracking">{m.trackingCode}</p>
          <div className="driver-mission-badges">
            <MissionStatusBadge status={m.status} />
            <PriorityBadge priority={m.priority} />
          </div>
        </div>
      </div>

      <div className="driver-mission-info-grid">
        <Info label="Patient" value={m.patient?.fullName || 'Unknown'} icon={<User size={14} />} />
        <Info label="Age / Gender" value={[m.patient?.age, m.patient?.gender].filter(Boolean).join(' · ') || '—'} />
        <Info label="Pickup" value={m.pickupLocation} icon={<MapPin size={14} />} />
        <Info label="Destination" value={m.destination || 'Hospital TBD'} icon={<MapPin size={14} />} />
        <Info label="Dispatcher" value={m.dispatcher?.user?.username || 'Dispatch'} />
        <Info label="Assigned" value={m.assignedAt ? format(new Date(m.assignedAt), 'MMM d, h:mm a') : '—'} />
        {m.incidentCategory && (
          <Info label="Case Type" value={m.incidentCategory.name} icon={<AlertTriangle size={14} />} />
        )}
      </div>

      {(m.notes || m.patientCondition) && (
        <DriverPanel title="Mission Notes">
          {m.notes && <p className="driver-note-text">{m.notes}</p>}
          {m.patientCondition && (
            <p className="driver-note-text"><strong>Patient:</strong> {m.patientCondition}</p>
          )}
        </DriverPanel>
      )}

      <div className="driver-quick-actions-row">
        <a href="tel:+1911" className="driver-quick-link-btn">
          <Phone size={16} /> Contact Dispatcher
        </a>
        <Link href="/driver/incidents/new" className="driver-quick-link-btn secondary">
          <AlertTriangle size={16} /> Report Incident
        </Link>
      </div>

      {nextAction && (
        <button
          type="button"
          className={`driver-quick-action-btn ${nextAction.cls}`}
          onClick={handleAction}
          disabled={!onDuty}
        >
          <CheckCircle size={18} />
          {nextAction.label}
        </button>
      )}

      {!onDuty && (
        <p className="driver-warning-text">Clock in under Shift & Attendance to accept or update missions.</p>
      )}
    </div>
  )
}

function Info({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="driver-mission-info-item">
      {icon && <span className="driver-info-icon-sm">{icon}</span>}
      <div>
        <p className="driver-info-label-sm">{label}</p>
        <p className="driver-info-val-sm">{value}</p>
      </div>
    </div>
  )
}
