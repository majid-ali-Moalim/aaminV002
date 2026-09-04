'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  HeartHandshake,
  RefreshCw,
  Search,
  User,
  MapPin,
  ArrowRight,
  Stethoscope,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import type { EmergencyRequest } from '@/types'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import StatusBadge from '@/components/features/emergency/StatusBadge'
import EmergencyStatsBar from '@/components/features/emergency/EmergencyStatsBar'
import { useEmergencyPaths, useEmergencyPortal } from '@/lib/emergency/EmergencyPortalContext'
import { fetchEmergencyRequests } from '@/lib/emergency/fetchEmergencyRequests'
import {
  findLatestHandoverRecord,
  handoverOutcomeLabel,
  parseHandover,
} from '@/lib/nurse/patientCareTypes'
import { simpleActiveCaseStatus } from '@/components/features/emergency/missionStatusOptions'
import { HOSPITAL_REFUSAL_REASON_OPTIONS } from '@/lib/emergency/buildCaseClosureDefaults'

type HandoverSummary = {
  hospital: string
  outcome: string
  condition: string
  treatment: string
  receivingDoctor: string
  notes: string
  signature: string
  rejected: string
  nurseName: string
  at: string
}

function refusalLabel(value?: string | null) {
  if (!value) return ''
  return HOSPITAL_REFUSAL_REASON_OPTIONS.find((o) => o.value === value)?.label || value
}

function getHandoverSummary(request: EmergencyRequest): HandoverSummary | null {
  const record = findLatestHandoverRecord(request.patientCareRecords ?? [])
  if (!record) return null
  const parsed = parseHandover(record.clinicalNotes)
  if (!parsed) return null

  const rejected = (parsed.rejectedHospitals ?? [])
    .filter((r) => r.hospitalName?.trim())
    .map((r) => {
      const parts = [r.hospitalName.trim()]
      const reason = refusalLabel(r.reason)
      if (reason) parts.push(`(${reason})`)
      if (r.notes?.trim()) parts.push(`— ${r.notes.trim()}`)
      return parts.join(' ')
    })
    .join('; ')

  const nurseName = [record.nurse?.firstName, record.nurse?.lastName].filter(Boolean).join(' ') || 'Nurse'

  return {
    hospital:
      parsed.acceptedHospital ||
      request.destinationHospital?.name ||
      request.destination ||
      '—',
    outcome: handoverOutcomeLabel(parsed.patientOutcome),
    condition: parsed.patientCondition || '',
    treatment: parsed.treatmentGiven || '',
    receivingDoctor: parsed.receivingStaff || '',
    notes: parsed.notes || '',
    signature: parsed.signature || '',
    rejected,
    nurseName,
    at: String(record.createdAt ?? ''),
  }
}

function hasHandover(request: EmergencyRequest) {
  return Boolean(getHandoverSummary(request))
}

/** Cases with a saved nurse handover, or still in field workflow awaiting handover. */
function isHandoverQueueCase(request: EmergencyRequest) {
  if (hasHandover(request)) return true
  return ['ARRIVED_HOSPITAL', 'PATIENT_STABILIZED', 'TRANSPORTING', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED_SCENE'].includes(
    request.status,
  )
}

export default function HandoverPage() {
  const router = useRouter()
  const paths = useEmergencyPaths()
  const portal = useEmergencyPortal()
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [tab, setTab] = useState<'all' | 'done' | 'awaiting'>('all')

  const load = async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true)
      const data = await fetchEmergencyRequests(
        portal,
        portal === 'dispatcher' ? 'my-cases' : undefined,
      )
      const list = Array.isArray(data) ? data.filter(isHandoverQueueCase) : []
      setRequests(list)
    } catch (err) {
      console.error('Failed to fetch handover cases:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load(true)
    const interval = setInterval(() => load(false), 10000)
    return () => clearInterval(interval)
  }, [portal])

  const filtered = useMemo(() => {
    return requests
      .filter((r) => {
        if (tab === 'done') return hasHandover(r)
        if (tab === 'awaiting') return !hasHandover(r)
        return true
      })
      .filter((r) => {
        if (!searchTerm.trim()) return true
        const q = searchTerm.toLowerCase()
        const summary = getHandoverSummary(r)
        return (
          r.trackingCode?.toLowerCase().includes(q) ||
          r.patient?.fullName?.toLowerCase().includes(q) ||
          r.pickupLocation?.toLowerCase().includes(q) ||
          summary?.hospital?.toLowerCase().includes(q) ||
          summary?.nurseName?.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [requests, searchTerm, tab])

  const doneCount = requests.filter(hasHandover).length
  const awaitingCount = requests.filter((r) => !hasHandover(r)).length

  const stats = {
    total: filtered.length,
    active: awaitingCount,
    pending: 0,
    critical: filtered.filter((r) => r.priority === 'CRITICAL').length,
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <HeartHandshake className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
            Emergency Operations
          </p>
          <h1 className="text-3xl font-black tracking-tight">Patient Handover</h1>
          <p className="text-red-100/80 mt-2 max-w-2xl">
            Nurse hospital handovers — outcome, receiving hospital, rejected hospitals, and clinical notes.
          </p>
        </div>
      </div>

      <EmergencyStatsBar stats={stats} />

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'all' as const, label: 'All', count: requests.length },
            { id: 'done' as const, label: 'Handover saved', count: doneCount },
            { id: 'awaiting' as const, label: 'Awaiting handover', count: awaitingCount },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              tab === item.id
                ? 'bg-red-600 border-red-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-red-200'
            }`}
          >
            {item.label}
            <span
              className={`min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                tab === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {item.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by code, patient, hospital, nurse…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
          />
        </div>
        <Button variant="outline" onClick={() => load(true)} className="rounded-xl">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading && filtered.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 text-slate-500">
            Loading handovers…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <HeartHandshake className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No handover cases</p>
            <p className="text-sm text-slate-500 mt-1">
              Completed nurse handovers and in-progress missions appear here.
            </p>
          </div>
        ) : (
          filtered.map((request) => {
            const summary = getHandoverSummary(request)
            const destination =
              summary?.hospital ||
              request.destinationHospital?.name ||
              request.destination ||
              'Not set'

            return (
              <article
                key={request.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:border-red-100 transition-colors"
              >
                <div className="p-5 flex flex-col lg:flex-row gap-5">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-red-600">{request.trackingCode}</span>
                      <PriorityBadge priority={request.priority} size="sm" />
                      <StatusBadge status={request.status} size="sm" />
                      <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-lg border border-slate-200 text-slate-600">
                        {summary ? 'Handover saved' : `Awaiting · ${simpleActiveCaseStatus(request.status)}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400">Patient</p>
                          <p className="font-semibold text-slate-800">
                            {request.patient?.fullName || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400">Pickup</p>
                          <p className="font-medium text-slate-700 line-clamp-2">{request.pickupLocation}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400">Hospital</p>
                          <p className="font-medium text-slate-700">{destination}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Stethoscope className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400">Crew</p>
                          <p className="font-medium text-slate-700">
                            {[
                              request.ambulance?.ambulanceNumber,
                              request.nurse
                                ? `${request.nurse.firstName || ''} ${request.nurse.lastName || ''}`.trim()
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {summary ? (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-black text-emerald-900">Handover details</p>
                          <p className="text-xs text-emerald-700/80">
                            {summary.nurseName}
                            {summary.at ? ` · ${format(new Date(summary.at), 'PPp')}` : ''}
                          </p>
                        </div>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <dt className="text-[10px] font-bold uppercase text-slate-400">Patient status</dt>
                            <dd className="font-semibold text-slate-800">{summary.outcome}</dd>
                          </div>
                          {summary.receivingDoctor && (
                            <div>
                              <dt className="text-[10px] font-bold uppercase text-slate-400">Receiving doctor</dt>
                              <dd className="font-medium text-slate-800">{summary.receivingDoctor}</dd>
                            </div>
                          )}
                          {summary.condition && (
                            <div className="sm:col-span-2">
                              <dt className="text-[10px] font-bold uppercase text-slate-400">Condition</dt>
                              <dd className="text-slate-700">{summary.condition}</dd>
                            </div>
                          )}
                          {summary.treatment && (
                            <div className="sm:col-span-2">
                              <dt className="text-[10px] font-bold uppercase text-slate-400">Treatment en route</dt>
                              <dd className="text-slate-700">{summary.treatment}</dd>
                            </div>
                          )}
                          {summary.rejected && (
                            <div className="sm:col-span-2">
                              <dt className="text-[10px] font-bold uppercase text-slate-400">Rejected hospitals</dt>
                              <dd className="text-slate-700">{summary.rejected}</dd>
                            </div>
                          )}
                          {summary.notes && (
                            <div className="sm:col-span-2">
                              <dt className="text-[10px] font-bold uppercase text-slate-400">Notes</dt>
                              <dd className="text-slate-700">{summary.notes}</dd>
                            </div>
                          )}
                          {summary.signature && (
                            <div>
                              <dt className="text-[10px] font-bold uppercase text-slate-400">Signature</dt>
                              <dd className="font-medium text-slate-800">{summary.signature}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        Nurse has not saved hospital handover yet.
                        {request.updatedAt
                          ? ` Last update ${formatDistanceToNow(new Date(request.updatedAt), { addSuffix: true })}.`
                          : ''}
                      </p>
                    )}
                  </div>

                  <div className="lg:w-40 shrink-0 flex lg:flex-col gap-2">
                    <Button
                      className="flex-1 rounded-xl bg-red-600 hover:bg-red-700"
                      onClick={() => router.push(paths.caseDetail(request.id))}
                    >
                      Open case <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
