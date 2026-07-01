'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  X,
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
  ExternalLink,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'
import StatusBadge from '@/components/features/emergency/StatusBadge'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel'
import { parseClinicalRecord, parseHandover, parseMonitoring } from '@/lib/nurse/patientCareTypes'

type Props = {
  caseId: string | null
  open: boolean
  onClose: () => void
  /** Optional list item — used while full fetch loads */
  preview?: EmergencyRequest | null
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-slate-800 mt-1 whitespace-pre-wrap">{value}</p>
    </div>
  )
}

function clinicalRecordTitle(record: NonNullable<EmergencyRequest['patientCareRecords']>[number]) {
  if (parseClinicalRecord(record.clinicalNotes)) return 'Patient Assessment'
  if (parseMonitoring(record.clinicalNotes)) return 'Treatment & Monitoring'
  if (parseHandover(record.clinicalNotes)) return 'Hospital Handover'
  if (record.treatmentGiven) return `Treatment · ${record.treatmentGiven}`
  if (record.bloodPressure || record.heartRate || record.temperature) return 'Vital Signs'
  if (record.clinicalNotes?.toLowerCase().includes('patient loaded')) return 'Patient Loaded'
  return 'Medical Note'
}

function clinicalRecordSummary(record: NonNullable<EmergencyRequest['patientCareRecords']>[number]) {
  const assessment = parseClinicalRecord(record.clinicalNotes)
  if (assessment) {
    return [
      assessment.chiefComplaint && `Chief complaint: ${assessment.chiefComplaint}`,
      assessment.symptoms && `Symptoms: ${assessment.symptoms}`,
      assessment.assessmentNotes && `Notes: ${assessment.assessmentNotes}`,
    ].filter(Boolean).join('\n')
  }
  const monitoring = parseMonitoring(record.clinicalNotes)
  if (monitoring) {
    return [
      monitoring.condition && `Condition: ${monitoring.condition}`,
      monitoring.notes && `Notes: ${monitoring.notes}`,
      monitoring.bloodPressure && `BP: ${monitoring.bloodPressure}`,
      monitoring.heartRate && `HR: ${monitoring.heartRate}`,
    ].filter(Boolean).join('\n')
  }
  const handover = parseHandover(record.clinicalNotes)
  if (handover) {
    return [
      handover.patientCondition && `Condition: ${handover.patientCondition}`,
      handover.treatmentGiven && `Treatment: ${handover.treatmentGiven}`,
      handover.receivingStaff && `Receiving staff: ${handover.receivingStaff}`,
      handover.notes && `Notes: ${handover.notes}`,
    ].filter(Boolean).join('\n')
  }
  return [
    record.treatmentGiven && `Treatment: ${record.treatmentGiven}`,
    record.medications && `Medication: ${record.medications}`,
    record.clinicalNotes,
    record.bloodPressure && `BP: ${record.bloodPressure}`,
    record.heartRate && `HR: ${record.heartRate}`,
  ].filter(Boolean).join('\n')
}

export default function CaseDetailModal({ caseId, open, onClose, preview }: Props) {
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

  const logs = [...(request?.statusLogs ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const nurseRecords = request?.patientCareRecords ?? []

  function formatLogTitle(log: (typeof logs)[0]) {
    if (log.notes?.startsWith('[Nurse]')) {
      return log.notes.replace(/^\[Nurse\]\s*/, '')
    }
    if (log.fromStatus === log.toStatus && log.notes) {
      return log.notes
    }
    return log.toStatus?.replace(/_/g, ' ') ?? 'Update'
  }

  function logActor(log: (typeof logs)[0]) {
    const emp = log.changedByEmployee
    if (!emp) return null
    const role = emp.employeeRole?.name?.toLowerCase() ?? ''
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
    if (role.includes('nurse')) return name ? `Nurse · ${name}` : 'Nurse'
    if (role.includes('driver')) return name ? `Driver · ${name}` : 'Driver'
    return name || null
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-3xl max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-red-600 to-red-700 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200 mb-1">
                Case details
              </p>
              <h2 className="text-2xl font-black truncate">
                {request?.trackingCode || preview?.trackingCode || 'Loading…'}
              </h2>
              {request?.createdAt && (
                <p className="text-red-100/80 text-sm mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {request && (
            <div className="flex flex-wrap gap-2 mt-3">
              <PriorityBadge priority={request.priority} size="sm" />
              <StatusBadge status={request.status} size="sm" />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading && !request && (
            <div className="py-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-red-500 mb-3" />
              <p className="text-sm text-slate-500">Loading case information…</p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-4">{error}</p>
          )}

          {request && (
            <>
              <section className="rounded-2xl border border-slate-100 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <User className="w-4 h-4" /> Patient & caller
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <DetailRow label="Patient name" value={request.patient?.fullName} />
                  <DetailRow
                    label="Phone"
                    value={request.patient?.phone || request.callerPhone}
                  />
                  <DetailRow label="Caller name" value={request.callerName} />
                  <DetailRow label="Caller phone" value={request.callerPhone} />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-100 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Location
                </h3>
                <DetailRow label="Pickup" value={request.pickupLocation} />
                <DetailRow label="Landmark" value={request.pickupLandmark} />
                <PickupGpsPanel request={request} />
                <DetailRow label="Destination" value={request.destination || 'Not set'} />
                {request.region?.name && (
                  <DetailRow
                    label="Region / District"
                    value={[request.region?.name, request.district?.name].filter(Boolean).join(' · ')}
                  />
                )}
              </section>

              <section className="rounded-2xl border border-slate-100 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" /> Clinical
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <DetailRow label="Condition" value={request.patientCondition} />
                  <DetailRow label="Symptoms" value={request.symptoms} />
                  <DetailRow
                    label="Conscious / Breathing"
                    value={[request.consciousStatus, request.breathingStatus].filter(Boolean).join(' / ')}
                  />
                  <DetailRow
                    label="Equipment"
                    value={
                      [request.needsOxygen && 'Oxygen', request.needsStretcher && 'Stretcher']
                        .filter(Boolean)
                        .join(', ') || 'None noted'
                    }
                  />
                </div>
                {(request.notes || request.manualDispatchNotes) && (
                  <DetailRow label="Notes" value={request.manualDispatchNotes || request.notes} />
                )}
              </section>

              <section className="rounded-2xl border border-slate-100 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Truck className="w-4 h-4" /> Assignment
                </h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  <DetailRow label="Ambulance" value={request.ambulance?.ambulanceNumber || 'Unassigned'} />
                  <DetailRow
                    label="Driver"
                    value={
                      request.driver
                        ? `${request.driver.firstName} ${request.driver.lastName}`
                        : 'Unassigned'
                    }
                  />
                  <DetailRow
                    label="Nurse"
                    value={
                      request.nurse
                        ? `${request.nurse.firstName} ${request.nurse.lastName}`
                        : 'Unassigned'
                    }
                  />
                </div>
              </section>

              {logs.length > 0 && (
                <section className="rounded-2xl border border-slate-100 p-5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4" /> Mission updates
                  </h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {logs.map((log) => (
                      <div key={log.id} className="flex gap-3 text-sm">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${log.notes?.startsWith('[Nurse]') ? 'bg-rose-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="font-bold text-slate-800">{formatLogTitle(log)}</p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(log.createdAt), 'PPp')}
                            {logActor(log) ? ` · ${logActor(log)}` : ''}
                          </p>
                          {log.notes && !log.notes.startsWith('[Nurse]') && log.fromStatus !== log.toStatus && (
                            <p className="text-xs text-slate-600 mt-0.5 italic">{log.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {nurseRecords.length > 0 && (
                <section className="rounded-2xl border border-rose-100 bg-rose-50/40 p-5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-2 mb-4">
                    <Stethoscope className="w-4 h-4" /> Nurse clinical records
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {nurseRecords.slice(0, 8).map((record) => (
                      <div key={record.id} className="text-sm rounded-xl bg-white/80 border border-rose-100 p-3">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-800 font-bold">{clinicalRecordTitle(record)}</span>
                          <span className="text-xs text-slate-500 shrink-0">
                            {format(new Date(record.createdAt), 'h:mm a')}
                          </span>
                        </div>
                        {clinicalRecordSummary(record) && (
                          <p className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">
                            {clinicalRecordSummary(record)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 p-4 flex flex-col sm:flex-row gap-2 bg-slate-50">
          <Link href={`/admin/emergency-requests/${caseId}`} className="flex-1" onClick={onClose}>
            <Button variant="outline" className="w-full h-11 rounded-xl font-semibold gap-2">
              <ExternalLink className="w-4 h-4" />
              Full case page
            </Button>
          </Link>
          <Link href={`/admin/emergency-requests/track/${caseId}`} className="flex-1" onClick={onClose}>
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
