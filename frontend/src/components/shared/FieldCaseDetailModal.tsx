'use client'

import { format } from 'date-fns'
import {
  X,
  MapPin,
  User,
  Truck,
  RefreshCw,
  Stethoscope,
  FileText,
  Navigation,
} from 'lucide-react'
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel'
import { MissionStatusBadge, PriorityBadge } from '@/components/driver/DriverUI'
import { DispatcherContactActions } from '@/components/shared/DispatcherContactActions'
import { formatSomaliaPhoneDisplay, resolvePatientPhone } from '@/lib/phoneContact'
import './field-case-detail.css'

export type FieldCaseDetail = {
  id: string
  trackingCode: string
  status: string
  priority: string
  pickupLocation?: string
  pickupLandmark?: string
  pickupLatitude?: number | null
  pickupLongitude?: number | null
  destination?: string
  destinationHospital?: { name?: string } | null
  patientCondition?: string
  notes?: string
  assignedAt?: string
  completedAt?: string
  callerName?: string
  callerPhone?: string
  patient?: {
    fullName?: string
    phone?: string
    age?: number
    gender?: string
  } | null
  ambulance?: { ambulanceNumber?: string; plateNumber?: string; vehicleType?: string } | null
  dispatcher?: { user?: { username?: string }; firstName?: string; lastName?: string; phone?: string } | null
  driver?: { firstName?: string; lastName?: string; phone?: string } | null
  nurse?: { firstName?: string; lastName?: string; phone?: string } | null
  incidentCategory?: { name?: string } | null
  region?: { name?: string } | null
  district?: { name?: string } | null
}

type Props = {
  open: boolean
  onClose: () => void
  caseData: FieldCaseDetail | null
  loading?: boolean
  variant?: 'driver' | 'nurse'
  footerExtra?: React.ReactNode
}

function DetailBlock({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="field-case-detail-block">
      <p className="field-case-detail-label">{label}</p>
      <p className="field-case-detail-value">{value}</p>
    </div>
  )
}

export function FieldCaseDetailModal({
  open,
  onClose,
  caseData,
  loading = false,
  variant = 'driver',
  footerExtra,
}: Props) {
  if (!open) return null

  const patientPhone = resolvePatientPhone(caseData)
  const destination =
    caseData?.destination || caseData?.destinationHospital?.name || 'To be confirmed'
  const regionLabel = [caseData?.region?.name, caseData?.district?.name].filter(Boolean).join(' · ')
  const driverName = caseData?.driver
    ? `${caseData.driver.firstName || ''} ${caseData.driver.lastName || ''}`.trim()
    : ''
  const nurseName = caseData?.nurse
    ? `${caseData.nurse.firstName || ''} ${caseData.nurse.lastName || ''}`.trim()
    : ''
  const closeBtnClass = variant === 'driver' ? 'driver-btn-sm primary flex-1' : 'nurse-btn primary flex-1'
  const chatHref = variant === 'driver' ? '/driver/chat' : '/nurse/chat'

  return (
    <div className="field-case-modal-overlay" role="dialog" aria-modal="true">
      <button type="button" className="field-case-modal-backdrop" aria-label="Close" onClick={onClose} />
      <div className="field-case-modal-panel">
        <div className="field-case-modal-header">
          <div>
            <p className="field-case-modal-kicker">Case Details</p>
            <h2 className="field-case-modal-title">{caseData?.trackingCode || 'Loading…'}</h2>
            {caseData && (
              <div className="field-case-badges">
                <MissionStatusBadge status={caseData.status} />
                <PriorityBadge priority={caseData.priority} />
              </div>
            )}
          </div>
          <button type="button" className="field-case-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="field-case-modal-body">
          {loading && (
            <div className="field-case-modal-loading">
              <RefreshCw className="animate-spin" size={24} />
              <span>Loading case…</span>
            </div>
          )}

          {caseData && !loading && (
            <>
              <section className="field-case-detail-section">
                <h3 className="field-case-detail-section-title">
                  <User size={14} /> Patient
                </h3>
                <div className="field-case-detail-grid">
                  <DetailBlock label="Name" value={caseData.patient?.fullName || caseData.callerName} />
                  <DetailBlock label="Phone" value={formatSomaliaPhoneDisplay(patientPhone)} />
                  <DetailBlock
                    label="Age / Gender"
                    value={[caseData.patient?.age, caseData.patient?.gender].filter(Boolean).join(' · ')}
                  />
                  <DetailBlock label="Condition" value={caseData.patientCondition} />
                </div>
              </section>

              <section className="field-case-detail-section">
                <h3 className="field-case-detail-section-title">
                  <Truck size={14} /> Assigned dispatcher
                </h3>
                <DispatcherContactActions
                  dispatcher={caseData.dispatcher}
                  chatHref={chatHref}
                  variant={variant}
                  layout="stack"
                />
              </section>

              <section className="field-case-detail-section">
                <h3 className="field-case-detail-section-title">
                  <MapPin size={14} /> Pickup
                </h3>
                <DetailBlock label="Address" value={caseData.pickupLocation} />
                <DetailBlock label="Landmark" value={caseData.pickupLandmark} />
                <DetailBlock label="Region" value={regionLabel} />
                <PickupGpsPanel request={caseData} tone="dark" title="Exact GPS — shared by dispatch" />
              </section>

              <section className="field-case-detail-section">
                <h3 className="field-case-detail-section-title">
                  <Navigation size={14} /> Destination
                </h3>
                <DetailBlock label="Hospital / destination" value={destination} />
              </section>

              <section className="field-case-detail-section">
                <h3 className="field-case-detail-section-title">
                  <Stethoscope size={14} /> Case
                </h3>
                <div className="field-case-detail-grid">
                  <DetailBlock label="Case type" value={caseData.incidentCategory?.name} />
                  <DetailBlock label="Priority" value={caseData.priority} />
                  <DetailBlock label="Status" value={caseData.status?.replace(/_/g, ' ')} />
                </div>
              </section>

              <section className="field-case-detail-section">
                <h3 className="field-case-detail-section-title">
                  <Truck size={14} /> Crew & assignment
                </h3>
                <div className="field-case-detail-grid">
                  <DetailBlock label="Ambulance" value={caseData.ambulance?.ambulanceNumber} />
                  <DetailBlock label="Driver" value={driverName || undefined} />
                  <DetailBlock label="Nurse" value={nurseName || undefined} />
                  <DetailBlock label="Dispatcher" value={caseData.dispatcher?.user?.username} />
                  <DetailBlock
                    label="Assigned"
                    value={
                      caseData.assignedAt
                        ? format(new Date(caseData.assignedAt), 'MMM d, yyyy h:mm a')
                        : undefined
                    }
                  />
                  <DetailBlock
                    label="Completed"
                    value={
                      caseData.completedAt
                        ? format(new Date(caseData.completedAt), 'MMM d, yyyy h:mm a')
                        : undefined
                    }
                  />
                </div>
              </section>

              {caseData.notes && (
                <section className="field-case-detail-section">
                  <h3 className="field-case-detail-section-title">
                    <FileText size={14} /> Notes
                  </h3>
                  <p className="field-case-note-text whitespace-pre-wrap">{caseData.notes}</p>
                </section>
              )}
            </>
          )}
        </div>

        <div className="field-case-modal-footer">
          {footerExtra}
          <button type="button" className={closeBtnClass} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
