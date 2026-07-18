'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  MapPin,
  User,
  Phone,
  Truck,
  Clock,
  RefreshCw,
  Navigation,
  FileText,
  Stethoscope,
  Activity,
  ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'
import { format, formatDistanceToNow } from 'date-fns'
import StatusBadge from '@/components/features/emergency/StatusBadge'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel'
import { useEmergencyPaths } from '@/lib/emergency/EmergencyPortalContext'
import { parseClinicalRecord, parseHandover, parseMonitoring } from '@/lib/nurse/patientCareTypes'
import '@/components/features/emergency/case-detail.css'

function nurseName(record: NonNullable<EmergencyRequest['patientCareRecords']>[number]) {
  return [record.nurse?.firstName, record.nurse?.lastName].filter(Boolean).join(' ') || 'Nurse'
}

function clinicalRecordTitle(record: NonNullable<EmergencyRequest['patientCareRecords']>[number]) {
  if (parseClinicalRecord(record.clinicalNotes)) return 'Patient Assessment'
  if (parseMonitoring(record.clinicalNotes)) return 'Treatment & Monitoring'
  if (parseHandover(record.clinicalNotes)) return 'Hospital Handover'
  if (record.treatmentGiven) return `Treatment · ${record.treatmentGiven}`
  if (record.bloodPressure || record.heartRate || record.temperature || record.oxygenSaturation || record.respiratoryRate) {
    return 'Vital Signs'
  }
  if (record.clinicalNotes?.toLowerCase().includes('patient loaded')) return 'Patient Loaded'
  return 'Medical Note'
}

function clinicalRecordLines(record: NonNullable<EmergencyRequest['patientCareRecords']>[number]) {
  const assessment = parseClinicalRecord(record.clinicalNotes)
  if (assessment) {
    return [
      ['Chief complaint', assessment.chiefComplaint],
      ['Symptoms', assessment.symptoms],
      ['Consciousness', assessment.consciousnessLevel],
      ['Pain level', assessment.painLevel],
      ['Breathing', assessment.breathingStatus],
      ['Injury', assessment.injuryDescription],
      ['Assessment notes', assessment.assessmentNotes],
    ]
  }

  const monitoring = parseMonitoring(record.clinicalNotes)
  if (monitoring) {
    return [
      ['Blood pressure', monitoring.bloodPressure],
      ['Heart rate', monitoring.heartRate],
      ['Temperature', monitoring.temperature],
      ['Oxygen saturation', monitoring.oxygenSaturation],
      ['Respiratory rate', monitoring.respiratoryRate],
      ['Condition', monitoring.condition],
      ['Monitoring notes', monitoring.notes],
    ]
  }

  const handover = parseHandover(record.clinicalNotes)
  if (handover) {
    return [
      ['Patient condition', handover.patientCondition],
      ['Treatment given', handover.treatmentGiven],
      ['Receiving staff', handover.receivingStaff],
      ['Handover notes', handover.notes],
      ['Signature', handover.signature],
    ]
  }

  return [
    ['Blood pressure', record.bloodPressure],
    ['Heart rate', record.heartRate?.toString()],
    ['Temperature', record.temperature?.toString()],
    ['Oxygen saturation', record.oxygenSaturation?.toString()],
    ['Respiratory rate', record.respiratoryRate?.toString()],
    ['Medication', record.medications],
    ['Treatment', record.treatmentGiven],
    ['Medical notes', record.clinicalNotes],
  ]
}

function CaseField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="case-detail-field">
      <p className="case-detail-label">{label}</p>
      <p className="case-detail-value">{value || '—'}</p>
    </div>
  )
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

  const logs = [...(request.statusLogs ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const nurseRecords = request.patientCareRecords ?? []
  const driverReports = logs.filter((log) => log.notes?.includes('[Driver Report]'))

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
              Pending Queue
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
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="case-detail-hero-kicker">Case file</p>
            <h1 className="case-detail-hero-title">{request.trackingCode}</h1>
            <p className="case-detail-hero-meta">
              <Clock className="w-4 h-4" />
              Created {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
              <span>·</span>
              {format(new Date(request.createdAt), 'PPp')}
            </p>
            <div className="case-detail-hero-badges">
              <PriorityBadge priority={request.priority} size="sm" />
              <StatusBadge status={request.status} size="sm" />
            </div>
          </div>
        </div>
      </header>

      <div className="case-detail-layout">
        <div className="case-detail-main">
          <section className="case-detail-card">
            <h2 className="case-detail-section-title">
              <User className="w-4 h-4" />
              Patient
            </h2>
            <div className="case-detail-grid">
              <CaseField label="Name" value={request.patient?.fullName || 'Unknown'} />
              <div className="case-detail-field">
                <p className="case-detail-label">Phone</p>
                <p className="case-detail-value flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 opacity-60" />
                  {request.patient?.phone || request.callerPhone || '—'}
                </p>
              </div>
            </div>
          </section>

          {nurseRecords.length > 0 && (
            <section className="case-detail-card case-detail-card--accent">
              <h2 className="case-detail-section-title case-detail-section-title--rose">
                <Stethoscope className="w-4 h-4" />
                Nurse clinical documents & notes
              </h2>
              <div>
                {nurseRecords.map((record) => (
                  <article key={record.id} className="case-detail-clinical-item">
                    <div className="mb-3">
                      <p className="case-detail-value">{clinicalRecordTitle(record)}</p>
                      <p className="case-detail-subvalue">
                        {nurseName(record)} · {format(new Date(record.createdAt), 'PPp')}
                      </p>
                    </div>
                    <div className="case-detail-grid">
                      {clinicalRecordLines(record)
                        .filter(([, value]) => value)
                        .map(([label, value]) => (
                          <div key={label} className="case-detail-clinical-cell">
                            <p className="case-detail-label">{label}</p>
                            <p className="case-detail-value case-detail-value--muted">{value}</p>
                          </div>
                        ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="case-detail-card">
            <h2 className="case-detail-section-title">
              <MapPin className="w-4 h-4" />
              Locations
            </h2>
            <div className="space-y-4">
              <div className="case-detail-field">
                <p className="case-detail-label">Pickup</p>
                <p className="case-detail-value">{request.pickupLocation}</p>
                {request.pickupLandmark && (
                  <p className="case-detail-subvalue">{request.pickupLandmark}</p>
                )}
              </div>
              <PickupGpsPanel request={request} />
              <CaseField label="Destination" value={request.destination || 'Not set'} />
            </div>
          </section>

          <section className="case-detail-card">
            <h2 className="case-detail-section-title">
              <Stethoscope className="w-4 h-4" />
              Clinical information
            </h2>
            <div className="case-detail-grid">
              <CaseField label="Condition" value={request.patientCondition} />
              <CaseField label="Symptoms" value={request.symptoms} />
              <CaseField
                label="Conscious / Breathing"
                value={`${request.consciousStatus || '—'} / ${request.breathingStatus || '—'}`}
              />
              <CaseField
                label="Equipment needs"
                value={
                  [request.needsOxygen && 'Oxygen', request.needsStretcher && 'Stretcher']
                    .filter(Boolean)
                    .join(', ') || 'None noted'
                }
              />
            </div>
            {(request.notes || request.manualDispatchNotes) && (
              <div className="case-detail-divider">
                <p className="case-detail-label flex items-center gap-1 mb-2">
                  <FileText className="w-3 h-3" />
                  Notes
                </p>
                <p className="case-detail-value case-detail-value--muted whitespace-pre-wrap">
                  {request.manualDispatchNotes || request.notes}
                </p>
              </div>
            )}
          </section>

          <section className="case-detail-card">
            <h2 className="case-detail-section-title">
              <Truck className="w-4 h-4" />
              Assignment
            </h2>
            <div className="case-detail-grid case-detail-grid--3">
              <div className="case-detail-stat-tile">
                <p className="case-detail-label">Ambulance</p>
                <p className="case-detail-value highlight">
                  {request.ambulance?.ambulanceNumber || 'Unassigned'}
                </p>
              </div>
              <div className="case-detail-stat-tile">
                <p className="case-detail-label">Driver</p>
                <p className="case-detail-value">
                  {request.driver
                    ? `${request.driver.firstName} ${request.driver.lastName}`
                    : 'Unassigned'}
                </p>
              </div>
              <div className="case-detail-stat-tile">
                <p className="case-detail-label">Nurse</p>
                <p className="case-detail-value">
                  {request.nurse
                    ? `${request.nurse.firstName} ${request.nurse.lastName}`
                    : 'Unassigned'}
                </p>
              </div>
            </div>
            <p className="case-detail-hint">
              Mission status is updated by the assigned driver in the field.
            </p>
          </section>

          {driverReports.length > 0 && (
            <section className="case-detail-card case-detail-card--warn">
              <h2 className="case-detail-section-title case-detail-section-title--amber">
                <FileText className="w-4 h-4" />
                Driver run report
              </h2>
              <div className="space-y-3">
                {driverReports.map((log) => (
                  <div key={log.id} className="case-detail-note-block">
                    <p className="case-detail-subvalue mb-1">
                      {format(new Date(log.createdAt), 'PPp')}
                    </p>
                    <p className="case-detail-value case-detail-value--muted whitespace-pre-wrap">
                      {log.notes?.replace('[Driver Report]', '').trim()}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="case-detail-aside">
          <section className="case-detail-card lg:sticky lg:top-6">
            <h2 className="case-detail-section-title">
              <Activity className="w-4 h-4" />
              Status history
            </h2>
            {logs.length === 0 ? (
              <p className="case-detail-value case-detail-value--muted">No status updates yet.</p>
            ) : (
              <div className="case-detail-timeline">
                {logs.map((log, idx) => (
                  <div key={log.id} className="case-detail-timeline-item">
                    <div className="case-detail-timeline-rail">
                      <div className={`case-detail-timeline-dot${idx === 0 ? ' active' : ''}`} />
                      {idx < logs.length - 1 && <div className="case-detail-timeline-line" />}
                    </div>
                    <div className="case-detail-timeline-body">
                      <p className="case-detail-timeline-status">{log.toStatus}</p>
                      <p className="case-detail-timeline-time">
                        {format(new Date(log.createdAt), 'PPp')}
                      </p>
                      {log.notes && (
                        <p className="case-detail-timeline-notes">{log.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
