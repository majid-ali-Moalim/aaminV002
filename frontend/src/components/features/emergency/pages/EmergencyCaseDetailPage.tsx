'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  MapPin,
  User,
  Phone,
  Clock,
  RefreshCw,
  Navigation,
  ClipboardList,
  Building2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'
import { format, formatDistanceToNow } from 'date-fns'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel'
import { useEmergencyPaths } from '@/lib/emergency/EmergencyPortalContext'
import { simpleActiveCaseStatus } from '@/components/features/emergency/missionStatusOptions'
import '@/components/features/emergency/case-detail.css'
import CaseTimingPanel from '@/components/features/emergency/CaseTimingPanel'
import CaseStationSummary from '@/components/features/emergency/CaseStationSummary'
import CaseMissionRecordsPanel from '@/components/features/emergency/CaseMissionRecordsPanel'

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value?: string | null
  mono?: boolean
}) {
  return (
    <div className="case-detail-field">
      <p className="case-detail-label">{label}</p>
      <p className={`case-detail-value${mono ? ' font-mono text-sm' : ''}`}>{value?.trim() || '—'}</p>
    </div>
  )
}

function crewName(emp?: { firstName?: string | null; lastName?: string | null } | null) {
  if (!emp) return '—'
  return `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—'
}

export default function EmergencyCaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const paths = useEmergencyPaths()
  const id = params.id as string

  const [request, setRequest] = useState<EmergencyRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCase = useCallback(async () => {
    try {
      setError('')
      const data = await emergencyRequestsService.getById(id)
      if (!data) {
        setError('Case not found')
        setRequest(null)
        return
      }
      setRequest(data)
    } catch (err) {
      console.error('Failed to load case:', err)
      setError('Unable to load this case. It may have been removed or you lack access.')
      setRequest(null)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    setIsLoading(true)
    loadCase()
    const interval = setInterval(loadCase, 15000)
    return () => clearInterval(interval)
  }, [loadCase])

  if (isLoading && !request) {
    return (
      <div className="case-detail-page">
        <div className="case-detail-loading">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
          <p className="text-sm font-semibold">Loading case…</p>
        </div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="case-detail-page">
        <Button variant="outline" onClick={() => router.back()} className="rounded-xl w-fit">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="case-detail-error">{error || 'Case not found'}</div>
      </div>
    )
  }

  const simpleStatus = simpleActiveCaseStatus(request.status)
  const equipment = [
    request.needsOxygen && 'Oxygen',
    request.needsStretcher && 'Stretcher',
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="case-detail-page">
      <div className="case-detail-toolbar">
        <div className="case-detail-toolbar-group">
          <Button variant="outline" onClick={() => router.back()} className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Link href={paths.pending}>
            <Button variant="outline" className="rounded-xl">
              <ClipboardList className="w-4 h-4 mr-2" />
              Pending queue
            </Button>
          </Link>
        </div>
        <div className="case-detail-toolbar-group">
          <Button variant="outline" onClick={loadCase} className="rounded-xl">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link href={paths.caseTrack(request.id)}>
            <Button className="rounded-xl bg-red-600 hover:bg-red-700">
              <Navigation className="w-4 h-4 mr-2" />
              Live tracking
            </Button>
          </Link>
        </div>
      </div>

      <header className="case-detail-hero">
        <p className="case-detail-hero-kicker">Emergency case</p>
        <h1 className="case-detail-hero-title">{request.trackingCode}</h1>
        <p className="case-detail-hero-meta">
          <Clock className="w-4 h-4" />
          {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
          <span>·</span>
          {format(new Date(request.createdAt), 'PPp')}
        </p>
        <div className="case-detail-hero-badges">
          <PriorityBadge priority={request.priority} size="sm" />
          <span className="text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg bg-white/15 border border-white/25">
            {simpleStatus}
          </span>
        </div>
      </header>

      <section className="case-detail-card">
        <h2 className="case-detail-section-title">Case overview</h2>
        <div className="case-detail-grid case-detail-grid--3">
          <Field label="Status" value={simpleStatus} />
          <Field label="Priority" value={request.priority} />
          <Field label="Emergency type" value={request.incidentCategory?.name || request.patientCondition} />
          <Field label="Source" value={request.requestSource?.replace(/_/g, ' ')} />
          <Field label="Patient" value={request.patient?.fullName || request.callerName} />
          <Field label="Patient phone" value={request.patient?.phone || request.callerPhone} />
          <Field label="Caller" value={request.callerName} />
          <Field label="Caller phone" value={request.callerPhone} />
          <Field
            label="Hospital destination"
            value={request.destinationHospital?.name || request.destination}
          />
        </div>
      </section>

      <CaseTimingPanel request={request} />

      <CaseStationSummary request={request} />

      <section className="case-detail-card">
        <h2 className="case-detail-section-title">
          <MapPin className="w-4 h-4" />
          Location
        </h2>
        <div className="case-detail-grid">
          <Field label="Pickup address" value={request.pickupLocation} />
          <Field label="Landmark" value={request.pickupLandmark} />
          <Field
            label="Region / district"
            value={[request.region?.name, request.district?.name].filter(Boolean).join(' · ')}
          />
          <Field label="Destination" value={request.destination || request.destinationHospital?.name} />
        </div>
        <div className="case-detail-divider">
          <PickupGpsPanel request={request} title="Pickup GPS" />
        </div>
      </section>

      <section className="case-detail-card">
        <h2 className="case-detail-section-title">
          <User className="w-4 h-4" />
          Dispatch team
        </h2>
        <div className="case-detail-grid case-detail-grid--3">
          <Field label="Dispatcher" value={crewName(request.dispatcher)} />
          <Field label="Ambulance" value={request.ambulance?.ambulanceNumber} mono />
          <Field label="Plate" value={request.ambulance?.plateNumber} mono />
          <Field label="Driver" value={crewName(request.driver)} />
          <Field label="Driver phone" value={request.driver?.phone} />
          <Field label="Nurse" value={crewName(request.nurse)} />
          <Field label="Nurse phone" value={request.nurse?.phone} />
          <Field label="Station" value={request.station?.name} />
        </div>
        <p className="case-detail-hint mt-3">
          Driver starts the case; nurse records medical treatment and hospital handover.
        </p>
      </section>

      <section className="case-detail-card">
        <h2 className="case-detail-section-title">
          <AlertCircle className="w-4 h-4" />
          Patient condition (at request)
        </h2>
        <div className="case-detail-grid">
          <Field label="Condition" value={request.patientCondition} />
          <Field label="Symptoms" value={request.symptoms} />
          <Field label="Conscious" value={request.consciousStatus} />
          <Field label="Breathing" value={request.breathingStatus} />
          <Field label="Bleeding" value={request.bleedingStatus} />
          <Field label="Equipment needed" value={equipment || 'None noted'} />
        </div>
        {(request.notes || request.manualDispatchNotes) && (
          <div className="case-detail-divider">
            <Field label="Dispatch notes" value={request.manualDispatchNotes || request.notes} />
          </div>
        )}
        {request.cancellationReason && (
          <div className="case-detail-divider">
            <Field label="Cancellation reason" value={request.cancellationReason} />
          </div>
        )}
      </section>

      <section className="case-detail-card case-detail-card--accent">
        <h2 className="case-detail-section-title case-detail-section-title--rose">
          <Building2 className="w-4 h-4" />
          Mission timeline & records
        </h2>
        <CaseMissionRecordsPanel request={request} hideCrewSummary hideTitle />
      </section>
    </div>
  )
}
