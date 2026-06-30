'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  X,
  MapPin,
  User,
  Phone,
  Truck,
  Clock,
  RefreshCw,
  Stethoscope,
  FileText,
  Navigation,
} from 'lucide-react'
import { driverMissionsApi } from '@/lib/driverApi'
import { MissionStatusBadge, PriorityBadge } from '@/components/driver/DriverUI'
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel'
import type { DriverMission } from '@/lib/stores/driverStore'

type Props = {
  missionId: string | null
  open: boolean
  onClose: () => void
  onAccept?: (missionId: string) => void
  onReject?: (missionId: string) => void
  showAccept?: boolean
}

function DetailBlock({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="driver-detail-block">
      <p className="driver-detail-label">{label}</p>
      <p className="driver-detail-value">{value}</p>
    </div>
  )
}

export default function DriverMissionDetailModal({
  missionId,
  open,
  onClose,
  onAccept,
  onReject,
  showAccept = false,
}: Props) {
  const [mission, setMission] = useState<DriverMission | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !missionId) return
    setLoading(true)
    setMission(null)
    driverMissionsApi
      .getById(missionId)
      .then((data) => setMission(data))
      .catch(() => toast.error('Could not load mission details'))
      .finally(() => setLoading(false))
  }, [open, missionId])

  if (!open || !missionId) return null

  return (
    <div className="driver-modal-overlay" role="dialog" aria-modal="true">
      <button type="button" className="driver-modal-backdrop" aria-label="Close" onClick={onClose} />
      <div className="driver-modal-panel">
        <div className="driver-modal-header">
          <div>
            <p className="driver-modal-kicker">Mission details</p>
            <h2 className="driver-modal-title">{mission?.trackingCode || 'Loading…'}</h2>
            {mission && (
              <div className="driver-mlc-badges mt-2">
                <MissionStatusBadge status={mission.status} />
                <PriorityBadge priority={mission.priority} />
              </div>
            )}
          </div>
          <button type="button" className="driver-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="driver-modal-body">
          {loading && (
            <div className="driver-modal-loading">
              <RefreshCw className="animate-spin" size={24} />
              <span>Loading mission…</span>
            </div>
          )}

          {mission && !loading && (
            <div className="driver-detail-sections">
              <section className="driver-detail-section">
                <h3 className="driver-detail-section-title">
                  <User size={14} /> Patient
                </h3>
                <div className="driver-detail-grid">
                  <DetailBlock label="Name" value={mission.patient?.fullName} />
                  <DetailBlock label="Phone" value={mission.patient?.phone} />
                  <DetailBlock
                    label="Age / Gender"
                    value={[mission.patient?.age, mission.patient?.gender].filter(Boolean).join(' · ')}
                  />
                </div>
              </section>

              <section className="driver-detail-section">
                <h3 className="driver-detail-section-title">
                  <MapPin size={14} /> Pickup location
                </h3>
                <DetailBlock label="Address" value={mission.pickupLocation} />
                <DetailBlock label="Landmark" value={mission.pickupLandmark} />
                <PickupGpsPanel
                  request={mission}
                  tone="dark"
                  title="Exact GPS — shared by dispatch"
                />
              </section>

              <section className="driver-detail-section">
                <h3 className="driver-detail-section-title">
                  <Navigation size={14} /> Destination
                </h3>
                <DetailBlock label="Hospital / destination" value={mission.destination || 'To be confirmed'} />
              </section>

              <section className="driver-detail-section">
                <h3 className="driver-detail-section-title">
                  <Stethoscope size={14} /> Clinical
                </h3>
                <div className="driver-detail-grid">
                  <DetailBlock label="Condition" value={mission.patientCondition} />
                  <DetailBlock label="Case type" value={mission.incidentCategory?.name} />
                </div>
              </section>

              <section className="driver-detail-section">
                <h3 className="driver-detail-section-title">
                  <Truck size={14} /> Assignment
                </h3>
                <div className="driver-detail-grid">
                  <DetailBlock label="Ambulance" value={mission.ambulance?.ambulanceNumber} />
                  <DetailBlock label="Dispatcher" value={mission.dispatcher?.user?.username} />
                  <DetailBlock
                    label="Assigned"
                    value={
                      mission.assignedAt
                        ? format(new Date(mission.assignedAt), 'MMM d, yyyy h:mm a')
                        : undefined
                    }
                  />
                </div>
              </section>

              {(mission.notes || mission.patientCondition) && (
                <section className="driver-detail-section">
                  <h3 className="driver-detail-section-title">
                    <FileText size={14} /> Notes
                  </h3>
                  {mission.notes && <p className="driver-note-text whitespace-pre-wrap">{mission.notes}</p>}
                </section>
              )}
            </div>
          )}
        </div>

        {mission && showAccept && mission.status === 'ASSIGNED' && onAccept && (
          <div className="driver-modal-footer">
            <button
              type="button"
              className="driver-btn-sm ghost flex-1"
              onClick={onClose}
            >
              Close
            </button>
            {onReject && (
              <button
                type="button"
                className="driver-btn-sm ghost flex-1 text-red-500 border-red-200"
                onClick={() => onReject(mission.id)}
              >
                Reject
              </button>
            )}
            <button
              type="button"
              className="driver-btn-sm primary flex-1"
              onClick={() => onAccept(mission.id)}
            >
              Accept Assignment
            </button>
          </div>
        )}

        {mission && (!showAccept || mission.status !== 'ASSIGNED') && (
          <div className="driver-modal-footer">
            <a
              href={`tel:${mission.patient?.phone || ''}`}
              className="driver-btn-sm ghost flex-1 inline-flex items-center justify-center gap-2"
            >
              <Phone size={16} /> Call patient
            </a>
            <button type="button" className="driver-btn-sm primary flex-1" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
