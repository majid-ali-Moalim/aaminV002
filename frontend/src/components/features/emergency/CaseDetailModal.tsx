'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  X,
  MapPin,
  User,
  Clock,
  RefreshCw,
  Navigation,
  Stethoscope,
  ExternalLink,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'
import StatusBadge from '@/components/features/emergency/StatusBadge'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel'
import CaseMissionRecordsPanel from '@/components/features/emergency/CaseMissionRecordsPanel'
import CaseTimingPanel from '@/components/features/emergency/CaseTimingPanel'
import CaseStationSummary from '@/components/features/emergency/CaseStationSummary'
import '@/components/features/emergency/case-detail.css'

type Props = {
  caseId: string | null
  open: boolean
  onClose: () => void
  /** Optional list item — used while full fetch loads */
  preview?: EmergencyRequest | null
  casePageBase?: string
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="case-detail-field">
      <p className="case-detail-label">{label}</p>
      <p className="case-detail-value">{value}</p>
    </div>
  )
}

export default function CaseDetailModal({
  caseId,
  open,
  onClose,
  preview,
  casePageBase = '/admin/emergency-requests',
}: Props) {
  const [request, setRequest] = useState<EmergencyRequest | null>(preview ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!caseId) return
    setLoading(true)
    setError('')
    try {
      const data = await emergencyRequestsService.getById(caseId)
      setRequest(data)
    } catch {
      setError('Could not load full case details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open || !caseId) return
    setRequest(preview ?? null)
    void load()
    const interval = setInterval(() => load(), 4000)
    return () => clearInterval(interval)
  }, [open, caseId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || !caseId) return null

  return (
    <div className="case-detail-modal-overlay">
      <button
        type="button"
        aria-label="Close"
        className="case-detail-modal-backdrop"
        onClick={onClose}
      />
      <div className="case-detail-modal-panel">
        <div className="case-detail-modal-header">
          <div className="case-detail-modal-header-top">
            <div className="min-w-0">
              <p className="case-detail-hero-kicker">Case details</p>
              <h2 className="case-detail-hero-title truncate">
                {request?.trackingCode || preview?.trackingCode || 'Loading…'}
              </h2>
              {request?.createdAt && (
                <p className="case-detail-hero-meta">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                </p>
              )}
            </div>
            <button type="button" onClick={onClose} className="case-detail-modal-close">
              <X className="w-5 h-5" />
            </button>
          </div>
          {request && (
            <div className="case-detail-hero-badges">
              <PriorityBadge priority={request.priority} size="sm" />
              <StatusBadge status={request.status} size="sm" />
            </div>
          )}
        </div>

        <div className="case-detail-modal-body">
          {loading && !request && (
            <div className="case-detail-loading">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-red-500 mb-3" />
              <p className="text-sm">Loading case information…</p>
            </div>
          )}

          {error && <p className="case-detail-alert">{error}</p>}

          {request && (
            <>
              <section className="case-detail-card">
                <h3 className="case-detail-section-title">
                  <User className="w-4 h-4" /> Patient & caller
                </h3>
                <div className="case-detail-grid">
                  <DetailField label="Patient name" value={request.patient?.fullName} />
                  <DetailField
                    label="Phone"
                    value={request.patient?.phone || request.callerPhone}
                  />
                  <DetailField
                    label="Gender"
                    value={request.patient?.gender?.replace('_', ' ') || undefined}
                  />
                  <DetailField
                    label="Age"
                    value={
                      request.patient?.age != null ? String(request.patient.age) : undefined
                    }
                  />
                </div>
              </section>

              <CaseStationSummary request={request} />

              <section className="case-detail-card">
                <h3 className="case-detail-section-title">
                  <MapPin className="w-4 h-4" /> Location
                </h3>
                <div className="case-detail-grid">
                  <DetailField label="Pickup" value={request.pickupLocation} />
                  <DetailField label="Landmark" value={request.pickupLandmark} />
                  <DetailField label="Destination" value={request.destination || 'Not set'} />
                  {request.region?.name && (
                    <DetailField
                      label="Region / District"
                      value={[request.region?.name, request.district?.name].filter(Boolean).join(' · ')}
                    />
                  )}
                </div>
                <div className="case-detail-divider">
                  <PickupGpsPanel request={request} />
                </div>
              </section>

              <section className="case-detail-card">
                <h3 className="case-detail-section-title">
                  <Stethoscope className="w-4 h-4" /> Clinical
                </h3>
                <div className="case-detail-grid">
                  <DetailField label="Condition" value={request.patientCondition} />
                  <DetailField label="Symptoms" value={request.symptoms} />
                  <DetailField
                    label="Conscious / Breathing"
                    value={[request.consciousStatus, request.breathingStatus].filter(Boolean).join(' / ')}
                  />
                  <DetailField
                    label="Equipment"
                    value={
                      [request.needsOxygen && 'Oxygen', request.needsStretcher && 'Stretcher']
                        .filter(Boolean)
                        .join(', ') || 'None noted'
                    }
                  />
                </div>
                {(request.notes || request.manualDispatchNotes) && (
                  <div className="case-detail-divider">
                    <DetailField label="Notes" value={request.manualDispatchNotes || request.notes} />
                  </div>
                )}
              </section>

              <CaseTimingPanel request={request} />

              <section className="case-detail-card">
                <CaseMissionRecordsPanel request={request} />
              </section>
            </>
          )}
        </div>

        <div className="case-detail-modal-footer">
          <Link href={`${casePageBase}/${caseId}`} className="flex-1" onClick={onClose}>
            <Button variant="outline" className="w-full h-11 rounded-xl font-semibold gap-2">
              <ExternalLink className="w-4 h-4" />
              Full case page
            </Button>
          </Link>
          <Link href={`${casePageBase}/track/${caseId}`} className="flex-1" onClick={onClose}>
            <Button className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 font-semibold gap-2">
              <Navigation className="w-4 h-4" />
              Live tracking
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
